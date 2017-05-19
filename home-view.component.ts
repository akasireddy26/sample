import {Component, Output, EventEmitter, ViewContainerRef, ElementRef, ViewChild, Renderer} from '@angular/core';
import {
    MetricCardModel, PropertyModel, ProfileUserModel, MetricCommentModel,
    NarrativePostModel, MetricThreshold
} from "../../../app/app.type";
import {ActivatedRoute} from "@angular/router";
import * as _ from 'lodash';
import {AppService} from "../../../services/app.service";
import {DataCacheService} from "../../../services/datacache.services";
import {APP_CONST} from "../../../app/app.const";
import {ToastrService} from "ngx-toastr/toastr";
import {IrisDialogsService} from "../../../dialogs/iris-dialogs.service";
import {SummernoteModule,SummernoteComponent} from 'ng2-alt-summernote/ng2-alt-summernote';

@Component({
    selector: 'homeview',
    templateUrl: 'home-view.component.html'
})
export class HomeViewComponent {
    private summernoteOptions: SummernoteOptions;

    viewName:string = 'IRis Home';
    viewAsFlag:boolean = false;
    viewAsUserName:string='';
    orgMetricTypeList:MetricCardModel[] = [];
    errorMessage:string;
    userAdsId:string;
    profileInfo:ProfileUserModel;
    currentUserProfileInfo : ProfileUserModel;
    isAdmin:boolean = false;
    reset: any;
    summernote:SummernoteComponent;
    private currentDate = new Date();

    envConfig:PropertyModel[];
    analyticsApiDomain:string;
    private homeNarrativeText:string = null;
    private searchCardStr:string = null;
    private searchInprogress:boolean = false;
    private searchResultCards:MetricCardModel[] = [];
    private editingNarrative;
    private narrativeText;
    private savedNarrativeText;
    private existingNarrative:MetricCommentModel;
    private narrativeAvailableForCurrentUser:boolean = false;

    disabled:boolean  = false;
    text = new String('');
    options:any;

    constructor(private route: ActivatedRoute,
                private renderer : Renderer,
                private appService: AppService,
                private dataCacheService: DataCacheService,
                private toastrService:ToastrService,
                private irisDialogsService:IrisDialogsService,
                private viewContainerRef:ViewContainerRef){

    }

    ngOnInit() {
        this.viewName = this.route.snapshot.params['viewName'] || this.viewName;
        //       this.viewAsFlag = false;

        this.route.data.subscribe((data:{profileInfo:ProfileUserModel}) => {
            this.profileInfo = data.profileInfo;
            if (this.profileInfo && !this.viewAsFlag) this.userAdsId = this.profileInfo.adsId;

            //Check if admin
            this.checkAdminRole();
        });

        this.route.data.subscribe((data:{envConfig:any}) => {
            this.envConfig = data.envConfig;
            let domainProperty = _.find(data.envConfig, function (o:PropertyModel) {
                return o.propertyName === "IAM_DOMAIN";
            });
            if (domainProperty) this.analyticsApiDomain = domainProperty.propertyValue;
        });

        this.route.data.subscribe((data:{metricCardCatalogs:MetricCardModel[]}) => {
            this.metricTypeList.length = 0;
            this.metricTypeList = data.metricCardCatalogs;
            this.metricTypeList = _.sortBy(this.metricTypeList, ['metricCardId']);
        });

        this.route.params.subscribe(params => {
            if (params['viewAsFlag']) {
                this.viewAsFlag = params['viewAsFlag'].toString() === "true";
            }
            if (this.viewAsFlag && params['viewAsAdsId']) {
                this.userAdsId = params['viewAsAdsId'];
                this.viewAsUserName = params['viewAsUserName'] ? _.startCase(decodeURIComponent(params['viewAsUserName'])) : null;
            } else {
                this.userAdsId = this.profileInfo.adsId;
            }

            this.currentUserProfileInfo = this.dataCacheService.getCurrentUserProfile();
            //Get Home page narrative for the user
            this.homeNarrativeText = null;
            this.narrativeAvailableForCurrentUser = false;
            this.getHomePageNarrative(this.currentUserProfileInfo.userEcn);
            //Get Org Pinned cards
            this.fetchPinnedCardsForOrg(this.currentUserProfileInfo.org);
        });
    }
        this.reset = function(context){

	let reset = function(context) {
	let ui = this.summernote.ui;
	let button = ui.button({
		contents: '<i class="fa fa-pencil"/> Reset',
		tooltip: 'Rest text area',
		click: function() {
		//context.invoke('editor.textArea', ' ');
		//this.narrativeText = ' ';
	}
	});

	return button.render();
	}
	
	};
        this.setupSummernoteOptions();
    }
    /*
     stubThresholdData(){

     this.metricTypeList.forEach((metricType:MetricCardModel)=>{
     if(metricType.metricCardId === 7){
     metricType.threshold = new MetricThreshold(60,100,75,50);
     }else if(metricType.metricCardId === 8){
     metricType.threshold = new MetricThreshold(78.28765,0,50,75);
     }else if(metricType.metricCardId === 19){
     metricType.threshold = new MetricThreshold(6700,100,75,50);
     }else if(metricType.metricCardId === 21){
     metricType.threshold = new MetricThreshold(4100000,0,50,75);
     }else if(metricType.metricCardId === 25){
     metricType.threshold = null;
     }else if(metricType.metricCardId === 148){
     metricType.threshold = null;
     }
     })

     }*/

    getHomePageNarrative(userEcn:string){
        this.homeNarrativeText = null;
        this.existingNarrative = null;
        this.narrativeText = null;
        this.appService.getUserHomeNarraive(userEcn).subscribe((narrative:MetricCommentModel[])=>{
            if(narrative && narrative.length > 0){
                this.existingNarrative = narrative[0];
                this.homeNarrativeText = this.existingNarrative.metricCommentText;

                if(narrative[0].userEcn == this.currentUserProfileInfo.userEcn){
                    this.narrativeAvailableForCurrentUser = true;
                }
            }else{
                if(userEcn != this.currentUserProfileInfo.org){ //If metric not found for the current user, fetch narrative for the org i.e., unitCIO
                    this.getHomePageNarrative(this.currentUserProfileInfo.org);
                }
            }
        });
    }
    searchCards(){
        if(!this.searchCardStr || this.searchCardStr.length<1) return;   // If there is nothing to search for, simply return.

        this.searchInprogress = true;

        let tempStr:string = this.searchCardStr;
        this.searchResultCards = _.filter(this.metricTypeList,function(o:MetricCardModel){
            return o.metricCardName.toLowerCase().indexOf(tempStr.toLowerCase())>-1;
        });
    }

    clearCardSearch(){
        this.searchResultCards = undefined;
        this.searchCardStr = "";
        this.searchInprogress = false;
    }

    fetchPinnedCardsForOrg(org:string){
        this.orgMetricTypeList = null;
        if(org){
            this.appService.getPinnedMetricTypes(org)
                .subscribe((metricCards:MetricCardModel[])=>{
                    this.orgMetricTypeList = metricCards;
                });
        }
    }

    private checkAdminRole() {
        if(this.profileInfo.userRoles){
            this.isAdmin = _.includes(this.profileInfo.userRoles,APP_CONST.ADMIN_ROLE);
        }
    }
    editNarrative() {
        this.editingNarrative = true;
        //this.narrativeTextArea.nativeElement.focus();
        if(this.existingNarrative && this.existingNarrative.userEcn == this.currentUserProfileInfo.userEcn){
            this.narrativeText = this.homeNarrativeText;
        }
    }

    isEmptyString(textToValidate:string):boolean{
        if(textToValidate){
            return textToValidate.trim().length === 0;
        }else{
            return true;
        }
    }

    cancelEdit(){
        this.narrativeText = null;
        this.editingNarrative = false;
    }

    saveNarrative() {
        this.editingNarrative = false;

        let narrativePostModel: NarrativePostModel = new NarrativePostModel();
        if(this.existingNarrative && this.existingNarrative.metricCommentId && this.narrativeAvailableForCurrentUser){
            narrativePostModel.metricCommentId = this.existingNarrative.metricCommentId;
            narrativePostModel.updtTs = `${this.currentDate.getFullYear()}-${this.currentDate.getMonth()+1}-${this.currentDate.getDate()}`;
        }

        narrativePostModel.creatTs = `${this.currentDate.getFullYear()}-${this.currentDate.getMonth()+1}-${this.currentDate.getDate()}`;
        narrativePostModel.secrPortalUser = this.appService.getDynamicUrlPrefix() + `/secrPortalUsers/${this.currentUserProfileInfo.userEcn}`;
        narrativePostModel.metricCommentText = this.narrativeText;
        this.appService.addNarrativeToUser(narrativePostModel).subscribe((data) => {
            if (data["_links"] && data["_links"].self) {
                this.toastrService.success(`Narrative updated for user ${this.currentUserProfileInfo.userName}`,"Successful");
                this.homeNarrativeText = narrativePostModel.metricCommentText;
                this.narrativeAvailableForCurrentUser = true;
                this.existingNarrative = data;
            }else{
                this.toastrService.error(`Unexpected error while adding narrative`,"Unexpected Error");
            }
        });
    }

    deleteNarrative(){
        this.irisDialogsService.showConfirmationDialog(`Are you sure you want to delete narrative for ${this.currentUserProfileInfo.userName}"?`,
            'Delete Confirmation','Delete','Cancel',this.viewContainerRef)
            .subscribe((result)=>{
                if(result){
                    this.appService.deleteNarrative(this.existingNarrative.metricCommentId).subscribe((statusCode:number)=>{
                        if(statusCode == 204){  //NoContent
                            this.homeNarrativeText = null;
                            this.existingNarrative = null;
                            this.narrativeText = null;
                            this.narrativeAvailableForCurrentUser = false;

                            this.toastrService.success(`User narrative deleted.`,"Successful");

                            this.getHomePageNarrative(this.currentUserProfileInfo.userEcn);
                        }
                    });
                }
            });
    }

    logNarrativeText(){
        console.log(this.narrativeText);
    }

    private setupSummernoteOptions() {
        this.summernoteOptions = {
            placeholder: 'Please enter your narrative here...',
            height: 150,
            focus: true,
            toolbar: [
                // [groupName, [list of button]]
                ['style',['style']],
                ['style', ['bold', 'italic', 'underline', 'clear']],
                ['font', ['strikethrough', 'superscript', 'subscript']],
                ['fontsize', ['fontsize']],
                ['color', ['color']],
                ['para', ['ul', 'ol', 'paragraph']],
                ['height', ['height']],
                ['table',['table']],
                ['reset',['reset']]
            ],
            buttons: {
                reset: this.reset
            }
        }
    }

}

interface JQueryStatic { summernote:any; }
