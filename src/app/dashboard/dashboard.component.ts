import {
  Component,
  OnInit,
  ViewChildren,
  QueryList,
  ElementRef,
} from '@angular/core';
import { UsersService } from '../users.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogCalendarComponent } from '../dialog-calendar/dialog-calendar.component';
import { Observable } from 'rxjs';
import { DialogNotepadComponent } from '../dialog-notepad/dialog-notepad.component';

import { DialogWalkthroughComponent } from '../dialog-walkthrough/dialog-walkthrough.component';
import { HotToastService } from '@ngneat/hot-toast';
import { LoginService } from '../login.service';
import { TenantsService } from '../tenants.service';
import { Router } from "@angular/router";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  @ViewChildren('widget') widgetElements: QueryList<ElementRef>;

  time: string;
  // cityName: string;
  // temperature: number;
  // weatherIcon: number;
  notes$: Observable<any>;
  notes: Array<any>;
  events$: Observable<any>;
  events: Array<any>;
  dragging: boolean = false;
  noGeo: boolean = false;
  storedUsername: string | null = null;
  // Corrected Final Report MASTER template (used for ALL clients).
  masterTemplateFile: File | null = null;
  isUploadingMasterTemplate: boolean = false;

  // Client FORM masters (blank fillable forms for ALL clients): the Final
  // Report Upon Completion (.docm, macros + dropdowns) and the Notice of
  // Unsafe Conditions (.docx). One master each, branded per-client on download.
  clientForms: { key: string; label: string; accept: string }[] = [
    { key: 'finalcompletion', label: 'Final Report Upon Completion', accept: '.docm,.docx' },
    { key: 'unsafeconditions', label: 'Notice of Unsafe Conditions', accept: '.docx,.docm' },
    // Generation master for the integrated Final Report on Final-Inspection
    // projects (David, Aug 21 2026): one master for ALL clients; each client's
    // own Multi-Tennant logo/footer and company name are inserted at
    // generation time, and the per-location repairs annex renders inside it.
    { key: 'finalrepairsmaster', label: 'Master Final Inspection Upon Completion of Repairs', accept: '.docx' },
  ];
  clientFormFile: { [key: string]: File | null } = {};
  isUploadingClientForm: { [key: string]: boolean } = {};

  /**
   * @param usersService The UsersService is injected to access client data and perform CRUD operations.
   * @param dialog The MatDialog service is injected to open pre-styled material design dialogs.
   */

  constructor(
    public usersService: UsersService,
    private dialog: MatDialog,

    private toast: HotToastService,
    public loginService: LoginService,
    private tenantsService: TenantsService,
    private router: Router
  ) {
    this.notes$ = this.usersService.notes;
    this.notes$.subscribe((notes) => {
      this.notes = notes;
    });

    this.events$ = this.usersService.events;
    this.events$.subscribe((events) => {
      if (events.length > 0 && events[0].events) {
        this.events = events[0].events.filter((event: any) => {
          const today = new Date();
          return event.start.toDate().toDateString() === today.toDateString();
        });
      } else {
        this.events = [];
      }
    });
  }

  // ---- Corrected Final Report MASTER template (ALL clients) ----
  onMasterTemplateSelected(event: any) {
    const file: File | null = (event.target.files && event.target.files[0]) || null;
    if (file && !/\.docx$/i.test(file.name)) {
      this.toast.error('The master template must be a Word .docx file.');
      event.target.value = '';
      return;
    }
    this.masterTemplateFile = file;
  }

  // ---- Client FORM masters (Final Upon Completion, Unsafe Conditions) ----
  onClientFormSelected(key: string, event: any) {
    const file: File | null = (event.target.files && event.target.files[0]) || null;
    if (file && !/\.(docm|docx)$/i.test(file.name)) {
      this.toast.error('The form must be a Word .docm or .docx file.');
      event.target.value = '';
      return;
    }
    this.clientFormFile[key] = file;
  }

  async uploadClientForm(key: string) {
    const file = this.clientFormFile[key];
    if (!file) {
      this.toast.error('Please choose the form file first.');
      return;
    }
    this.isUploadingClientForm[key] = true;
    try {
      await this.tenantsService.replaceClientForm(key, file).toPromise();
      this.toast.success('Form saved - it is now available to ALL clients under Reports.');
      this.clientFormFile[key] = null;
    } catch (error) {
      console.error('Client form upload failed:', error);
      this.toast.error('Upload failed - the form was NOT changed.');
    } finally {
      this.isUploadingClientForm[key] = false;
    }
  }

  async uploadMasterTemplate() {
    if (!this.masterTemplateFile) {
      this.toast.error('Please choose the corrected Final Report (.docx) first.');
      return;
    }
    this.isUploadingMasterTemplate = true;
    try {
      // The backend replaces the ONE master template used for every client;
      // the companyName field is kept only for API compatibility.
      await this.tenantsService
        .replaceFinalTemplate('master', this.masterTemplateFile)
        .toPromise();
      this.toast.success('Corrected Final Report saved - it is now the master template for ALL clients.');
      this.masterTemplateFile = null;
    } catch (error) {
      console.error('Master Final template upload failed:', error);
      this.toast.error('Upload failed - the master template was NOT changed.');
    } finally {
      this.isUploadingMasterTemplate = false;
    }
  }

  /**
   * Get gelocation, current date/time & current weather to then be displayed within dashboard widgets.
   */
  ngOnInit() {
    // this.getCurrentHour();
    // this.getCurrentWeather();
    // this.checkTutorial();
    this.performUserLoginSteps();
    const authData: any = JSON.parse(localStorage.getItem('authToken')!);
    const storedUsername = authData.name;

    if (storedUsername) {
      // If available, set it to the component property
      this.storedUsername = storedUsername;
    } else {
      // Otherwise, get it from the service and store it
      this.storedUsername = this.loginService.currentlyLoggedInUsername;
      localStorage.setItem('loggedInUsername', this.storedUsername);
    }
  }

  /**
   * Check if tutorial has already been seen
   */

  checkTutorial() {
    let tutorial = localStorage.getItem('tutorialSeen');
    if (!tutorial) {
      this.dialog.open(DialogWalkthroughComponent);
      localStorage.setItem('tutorialSeen', 'true');
    }
  }

  private performUserLoginSteps() {
    if (this.loginService.isLoggedIn()) {
      this.getCurrentHour();
    } else {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Gets the current time, and formats it as a string.
   */
  getCurrentHour() {
    const currentHour = new Date().getHours();

    if (currentHour >= 5 && currentHour < 12) {
      this.time = 'Good morning';
    } else if (currentHour >= 12 && currentHour < 18) {
      this.time = 'Good afternoon';
    } else if (currentHour >= 18 && currentHour < 22) {
      this.time = 'Good evening';
    } else {
      this.time = 'Good night';
    }
  }

  /**
   * Retrieves the current weather using geolocation.
   * If the weather data is available in local storage, it is used; otherwise, an API request is made.
   */
  async getCurrentWeather() {
    let cachedWeather = localStorage.getItem('weather');
    if (cachedWeather) {
      // this.temperature = JSON.parse(cachedWeather).temperature;
      // this.cityName = JSON.parse(cachedWeather).cityName;
      // this.weatherIcon = JSON.parse(cachedWeather).weatherIcon;
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => this.getPos(position),
      (error) => {
        this.rejectPos(error);
        this.noGeo = true;
      }
    );
  }

  /**
   *Retrieves the current position coordinates and uses them to fetch location and weather data.
   * @param position The object containing the coordinates (latitude and longitude).
   */

  async getPos(position: any) {
    let locationUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=x6YRAVajQSGgAIVNUX20e8lbKyOwot7A&q=${position.coords.latitude}%2C${position.coords.longitude}`;
    let locationResponse = await fetch(locationUrl);
    let locationData = await locationResponse.json();
    // this.cityName = locationData.LocalizedName;

    let weatherUrl = `https://dataservice.accuweather.com/currentconditions/v1/${locationData.Key}?apikey=x6YRAVajQSGgAIVNUX20e8lbKyOwot7A`;
    let weatherResponse = await fetch(weatherUrl);
    let weatherData = await weatherResponse.json();
    // this.temperature = weatherData[0].Temperature.Metric.Value;
    // this.weatherIcon = weatherData[0].WeatherIcon;

    // Store data in local storage
    const dataToCache = {
      // cityName: this.cityName,
      // temperature: this.temperature,
      // weatherIcon: this.weatherIcon,
    };
    localStorage.setItem('weather', JSON.stringify(dataToCache));
  }

  rejectPos(error: any) {
    this.toast.error(error.message);
  }

  /**
   * Get widget positions after being dragged in order to prevent widgets from overlapping.
   */
  /**
   *
   * @param event dragging event
   */

  getWidgetFinalPos(event: any) {
    //get positional data for currently dragged widget
    const draggedWidget = event.source.element.nativeElement;
    const draggedWidgetRect = draggedWidget.getBoundingClientRect();

    this.widgetElements.forEach((widget) => {
      if (widget.nativeElement !== draggedWidget) {
        const targetWidgetRect = widget.nativeElement.getBoundingClientRect();

        if (this.widgetOverlaps(draggedWidgetRect, targetWidgetRect)) {
          event.source._dragRef.reset();
        }
      }
    });
  }

  widgetOverlaps(draggedWidgetRect: any, targetWidgetRect: any) {
    return (
      draggedWidgetRect.right > targetWidgetRect.left &&
      draggedWidgetRect.left < targetWidgetRect.right &&
      draggedWidgetRect.bottom > targetWidgetRect.top &&
      draggedWidgetRect.top < targetWidgetRect.bottom
    );
  }

  /**
   * Logic to open calendar & notepad dialogs.
   */

  openCalendarViewDialog() {
    if (!this.dragging) {
      this.dialog.open(DialogCalendarComponent, {
        panelClass: 'custom-modalbox',
      });
    } else {
      this.dragging = false;
    }
  }

  openNotepadDialog(data: any) {
    if (!this.dragging) {
      const dialogRef = this.dialog.open(DialogNotepadComponent, {
        panelClass: 'notepad-box',
        data: { data },
      });

      dialogRef.afterClosed().subscribe((data) => {
        this.notes$ = data;
      });
    } else {
      this.dragging = false;
    }
  }
}
