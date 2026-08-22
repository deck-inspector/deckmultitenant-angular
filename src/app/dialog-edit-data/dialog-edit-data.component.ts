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
  proposalFile: File | null = null;
  phone: string = '';
  website: string = '';
  isSavingContact: boolean = false;
  // Per-section sizing (David, Aug 22): website logo in pixels, report
  // header/footer in inches. Independent width and height, no limits; null =
  // automatic.
  websiteW: number | null = null;
  websiteH: number | null = null;
  headerW: number | null = null;
  headerH: number | null = 0.75;
  footerW: number | null = null;
  footerH: number | null = 0.5;
  isSavingLogoSize: boolean = false;
  // What is currently STORED for this tenant, so each section can show its
  // last saved sizing and the inputs never look empty-by-accident.
  savedSizes: any = { website: { w: null, h: null }, header: { w: null, h: null }, footer: { w: null, h: null } };
  storedUsername: string | null = null;
  logoPreviewUrl: string | null = null;
  footerPreviewUrl: string | null = null;
  headerPreviewUrl: string | null = null;
  private _event: any;

  isSaving: boolean = false;
  isUploadingTemplate: boolean = false;
  isUploadingProposal: boolean = false;

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

    const legacy = dialogData?.reportLogoSizes;
    const bs = dialogData?.brandSizes || {};
    const pick = (v: any) => (Number(v) > 0 ? Number(v) : null);
    this.websiteW = pick(bs.website?.w);
    this.websiteH = pick(bs.website?.h);
    this.headerW = pick(bs.header?.w);
    this.headerH = pick(bs.header?.h) ?? (pick(legacy?.headerIn) ?? 0.75);
    this.footerW = pick(bs.footer?.w);
    this.footerH = pick(bs.footer?.h) ?? (pick(legacy?.footerIn) ?? 0.5);
    this.savedSizes = {
      website: { w: this.websiteW, h: this.websiteH },
      header: { w: this.headerW, h: this.headerH },
      footer: { w: this.footerW, h: this.footerH },
    };

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

  onProposalSelected(event: any) {
    this.proposalFile = event.target.files && event.target.files[0];
  }

  // The three sections' current values, ready to POST.
  private sizesBody() {
    const dim = (v: any) => (Number(v) > 0 ? Number(v) : null);
    return {
      website: { w: dim(this.websiteW), h: dim(this.websiteH) },
      header: { w: dim(this.headerW), h: dim(this.headerH) },
      footer: { w: dim(this.footerW), h: dim(this.footerH) },
    };
  }

  // Human-readable "what is stored" line for each section.
  savedLabel(section: string, unit: string): string {
    const s = (this.savedSizes && this.savedSizes[section]) || {};
    const w = Number(s.w) > 0 ? s.w + ' ' + unit : 'auto';
    const h = Number(s.h) > 0 ? s.h + ' ' + unit : 'auto';
    if (!(Number(s.w) > 0) && !(Number(s.h) > 0)) return 'Last saved: not set (using the standard size)';
    return 'Last saved: width ' + w + ' \u00d7 height ' + h;
  }

  saveLogoSize() {
    this.isSavingLogoSize = true;
    const body = this.sizesBody();
    this.tenantsService.updateReportLogoSizes(this.data.id, body).subscribe({
      next: () => {
        this.isSavingLogoSize = false;
        // Keep the values on screen and record them as the stored sizing -
        // the cells must never blank out after a save (David, Aug 22).
        this.savedSizes = JSON.parse(JSON.stringify(body));
        this.toast.success('Sizes saved - website size shows immediately; report sizes apply to every new document.');
      },
      error: () => {
        this.isSavingLogoSize = false;
        this.toast.error('Could not save the sizes.');
      },
    });
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

  async uploadProposalTemplate() {
    if (!this.proposalFile) {
      this.toast.error('Please choose a .docx proposal file.');
      return;
    }
    this.isUploadingProposal = true;
    try {
      await this.tenantsService
        .replaceProposalTemplate(this.data.companyIdentifier, this.proposalFile)
        .toPromise();
      this.toast.success('Proposal document updated for this tenant.');
      this.proposalFile = null;
    } catch (error) {
      console.error('Proposal upload failed:', error);
      this.toast.error('Failed to upload the Proposal document.');
    } finally {
      this.isUploadingProposal = false;
    }
  }

  async submitData() {
    this.isSaving = true;
    // Sizes save FIRST and unconditionally: the icons flow below refuses to
    // run unless all three images are present, and David expects "Ok" to keep
    // whatever he typed in the size boxes (David, Aug 22).
    try {
      const body = this.sizesBody();
      await this.tenantsService.updateReportLogoSizes(this.data.id, body).toPromise();
      this.savedSizes = JSON.parse(JSON.stringify(body));
    } catch (e) {
      console.error('Saving branding sizes failed:', e);
      this.toast.error('Could not save the logo sizes.');
    }

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
        // Images incomplete - that's fine, the sizes above are already saved.
        this.toast.success('Sizes saved. (Images unchanged - upload all three to replace them.)');
        this.isSaving = false;
        this.dialogRef.close();
        return;
      }
  }

  formValidator() {
    return false;
  }
}
