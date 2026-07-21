import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HotToastService } from '@ngneat/hot-toast';
import { TenantsService } from '../tenants.service';
import { LoginService } from '../login.service';

@Component({
  selector: 'app-dialog-edit-data',
  templateUrl: './dialog-edit-data.component.html',
  styleUrls: ['./dialog-edit-data.component.scss'],
})
export class DialogEditDataComponent {
  data = {
    id: '',
    iconHeader: '',
    iconFooter: '',
    companyIdentifier: '',
  };

  logoFile: File | null = null;
  headerFile: File | null = null;
  footerFile: File | null = null;
  templateFile: File | null = null;
  phone: string = '';
  website: string = '';
  isSavingContact: boolean = false;
  storedUsername: string | null = null;
  logoPreviewUrl: string | null = null;
  footerPreviewUrl: string | null = null;
  headerPreviewUrl: string | null = null;
  private _event: any;

  isSaving: boolean = false;
  isUploadingTemplate: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<DialogEditDataComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any,
    private tenantsService: TenantsService,
    private toast: HotToastService,
    public loginService: LoginService
  ) {
    this.data = { ...dialogData };
    this.phone = dialogData?.phone || '';
    this.website = dialogData?.website || '';

    const icons = dialogData?.icons;
    if (icons) {
      this.logoPreviewUrl = icons.logoUrl || null;
      this.headerPreviewUrl = icons.header || null;
      this.footerPreviewUrl = icons.footer || null;
    }
  }

  ngOnInIt() {
    const storedUsername = localStorage.getItem('loggedInUsername');
    if (storedUsername) {
      // If available, set it to the component property
      this.storedUsername = storedUsername;
    } else {
      // Otherwise, get it from the service and store it
      this.storedUsername = this.loginService.currentlyLoggedInUsername;
      localStorage.setItem('loggedInUsername', this.storedUsername);
    }
  }

  onNoClick() {
    this.dialogRef.close();
  }

  onFileSelected(type: string, event: any) {
    // const file = event.target.files && event.target.files[0];
    const file: File = event.target.files && event.target.files[0];
    if (type === 'companyLogo') {
      this.logoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
      this._event = event;
    } else if (type === 'reportHeader') {
      this.headerFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.headerPreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
      this._event = event;
    } else if (type === 'reportFooter') {
      this.footerFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.footerPreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
      this._event = event;
    }
  }

    onTemplateSelected(event: any) {
    this.templateFile = event.target.files && event.target.files[0];
  }

  saveContactInfo() {
    this.isSavingContact = true;
    const tenantId = this.data.id;
    this.tenantsService.updatePhone(tenantId, this.phone).subscribe({
      next: () => {
        this.tenantsService.updateWebsite(tenantId, this.website).subscribe({
          next: () => {
            this.isSavingContact = false;
            this.toast.success('Contact info saved.');
          },
          error: () => { this.isSavingContact = false; this.toast.error('Phone saved, website failed.'); }
        });
      },
      error: () => { this.isSavingContact = false; this.toast.error('Could not save contact info.'); }
    });
  }

  async uploadFinalTemplate() {
    if (!this.templateFile) {
      this.toast.error('Please choose a .docx template file.');
      return;
    }
    this.isUploadingTemplate = true;
    try {
      await this.tenantsService
        .replaceFinalTemplate(this.data.companyIdentifier, this.templateFile)
        .toPromise();
      this.toast.success('Final Report template updated for this tenant.');
      this.templateFile = null;
    } catch (error) {
      console.error('Final template upload failed:', error);
      this.toast.error('Failed to upload the Final Report template.');
    } finally {
      this.isUploadingTemplate = false;
    }
  }

  async submitData() {
    this.isSaving = true;
    let dataHeader = {
      entityName: 'header',
      uploader: 'anshgr',
      containerName: this.data.companyIdentifier
        .replace(/\s+/g, '')
        .toLowerCase(),
      picture: this.headerFile,
      id: this.data.id,
    };

    let dataFooter = {
      entityName: 'footer',
      uploader: 'anshgr',
      containerName: this.data.companyIdentifier
        .replace(/\s+/g, '')
        .toLowerCase(),
      picture: this.footerFile,
      id: this.data.id,
    };

    let dataLogo = {
      entityName: 'logo',
      uploader: 'anshgr',
      containerName: this.data.companyIdentifier
        .replace(/\s+/g, '')
        .toLowerCase(),
      picture: this.logoFile,
      id: this.data.id,
    };

    const iconsData: any = {};
    iconsData['logoUrl'] = this.logoPreviewUrl;
    iconsData['footer'] = this.footerPreviewUrl;
    iconsData['header'] = this.headerPreviewUrl;

    // console.log(iconsData, "Icond-data-before");

    if((iconsData['logoUrl'] !== null || this.logoFile !== null) && (iconsData['footer'] !== null || this.footerFile !== null) && (iconsData['header'] !== null || this.headerFile !== null))
      {
        try {
          if (this.footerFile) {
            const response = await this.tenantsService
              .uploadFile(dataFooter)
              .toPromise();
            iconsData['footer'] = response.url;
          }
    
          if (this.headerFile) {
            const response = await this.tenantsService
              .uploadFile(dataHeader)
              .toPromise();
            iconsData['header'] = response.url;
          }
    
          if (this.logoFile) {
            const response = await this.tenantsService
              .uploadFile(dataLogo)
              .toPromise();
            iconsData['logoUrl'] = response.url;
          }
    
          // Call the API for updating or adding icons for a tenant
            const apiResponse = await this.tenantsService
              .upsertIcons(this.data.id, iconsData)
              .toPromise();
            console.log(apiResponse);
    
            this.isSaving = false;
            this.dialogRef.close(); // Close the dialog after a successful update
            this.toast.success('Files updated successfully!')
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          
        } catch (error) {
          console.error('Error during file uploads or upsertIcons:', error);
          this.isSaving = false;
          this.toast.error('Failed to update or add icons for the tenant!');
        }
      } else {
        this.toast.error('Please upload all files!');
        this.isSaving = false;
        return;
      }
  }

  formValidator() {
    return false;
  }
}
