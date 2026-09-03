import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TenantsService } from '../tenants.service';
import { HotToastService } from '@ngneat/hot-toast';
import { MatDialog } from '@angular/material/dialog';
import { UsersService } from '../users.service';
import { DialogEditCustomFormComponent } from '../dialog-edit-custom-form/dialog-edit-custom-form.component';


@Component({
  selector: 'app-tenant-detail',
  templateUrl: './tenant-detail.component.html',
  styleUrls: ['./tenant-detail.component.scss'],
})
export class TenantDetailComponent {
  users$: any[];
  tenantDetails: any; // Adjust the type based on your tenant model
  showPassword: boolean[]; // Declare the array
  tenantId: string;
  resetIdx: number = -1;
  newPassword: string = '';
  resetting: boolean = false;

    /**
   *
   * @param usersService The UsersService is injected to access client data and perform CRUD operations.
   * @param dialog The MatDialog service is injected to open pre-styled material design dialogs.
   * @param router Router gets injected to enable direct URL navigation.
   */

  constructor(
    public usersService: UsersService,
    private route: ActivatedRoute,
    private tenantsService: TenantsService,
    private toast: HotToastService,
    private dialog: MatDialog,
  ) {
    this.showPassword = Array(this.tenantDetails?.adminDetails.length).fill(
      false
    );
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.tenantId = params['id'];
      this.getTenantDetails(this.tenantId);
    });
  }

  formatBytesToGB(bytes: number): string {
    if (bytes === 0) return '0 GB';

    const gigabytes = bytes / 1024 ** 3; // Convert bytes to gigabytes
    return gigabytes.toFixed(2);
  }

  getTenantDetails(tenantId: string): void {
    this.tenantsService.getTenantById(tenantId).subscribe(
      (tenantDetails) => {
        this.tenantDetails = tenantDetails.Tenant;
        console.log('tenant', this.tenantDetails);
      },
      (error) => {
        console.error('Error fetching tenant details:', error);
        // Handle the error (e.g., show an error message)
      }
    );
  }

  toggleStatus(tenantId: string, status: boolean) {
    this.tenantsService.toggleShowFooterLogo(tenantId, !status).subscribe(
      (response) => {
        // console.log('Footer logo status toggled successfully:', response);
        // Update the current status after successful toggle
        this.tenantDetails.showFooterlogo = !status;
        this.toast.success('Footer Logo Status Toggled Successfully');
        // window.location.reload();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      },
      (error) => {
        console.error('Error:', error);
        this.toast.error('Failed to Toggle Footer Logo Status! Please try again later.');
        // Handle error, e.g., show an error message
      }
    );
  }

  openEditCustomFormDialog(tenantId: string) {
    // Fetch the existing data for the selected tenant using tenantId
    // console.log(tenantId);
    this.tenantsService.getTenantById(tenantId).subscribe(
      (existingData) => {
        // console.log(existingData);
        const dialogRef = this.dialog.open(DialogEditCustomFormComponent, {
          data: {
            ...existingData.Tenant, // spread existing data properties
            id: tenantId, // make sure 'id' is set in the data
          },
        });

        dialogRef.afterClosed().subscribe(() => {
          this.tenantsService.getAllTenants().subscribe(
            (res) => {
              this.users$ = res.Tenants;
            },
            (err) => {
              console.log(err);
            }
          );
        });
      },
      (error) => {
        console.error(error);
      }
    );
  }

  // getTenantDetails(tenantId: string): void {
  //   this.tenantsService.getTenantById(tenantId).subscribe(
  //     (tenantDetails) => {
  //       this.tenantDetails = tenantDetails; // Update based on your API response structure
  //       console.log('Tenant Details:', this.tenantDetails);
  //     },
  //     (error) => {
  //       console.error('Error fetching tenant details:', error);
  //       // Handle the error (e.g., show an error message)
  //     }
  //   );
  // }

  startReset(i: number): void { this.resetIdx = i; this.newPassword = ''; }
  cancelReset(): void { this.resetIdx = -1; this.newPassword = ''; }
  saveReset(admin: any): void {
    const pwd = (this.newPassword || '').trim();
    if (!pwd) { this.toast.error('Enter a new password'); return; }
    this.resetting = true;
    this.tenantsService.resetAdminPassword(this.tenantId, admin.username, pwd).subscribe(
      () => {
        this.resetting = false;
        this.toast.success('Password reset for ' + admin.username);
        this.cancelReset();
        this.getTenantDetails(this.tenantId);
      },
      (error) => {
        this.resetting = false;
        const msg = (error && (error.error && typeof error.error === 'string' ? error.error : error.message)) || 'Reset failed';
        this.toast.error('Error: ' + msg);
      }
    );
  }

  togglePasswordVisibility(index: number): void {
    this.showPassword[index] = !this.showPassword[index];
  }
}
