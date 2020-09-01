import { Component, Input, OnInit, ViewEncapsulation } from "@angular/core";
// import { WebPartContext } from "@microsoft/sp-webpart-base";
// import { MSGraphClient } from "@microsoft/sp-http";
import * as microsoftTeams from "@microsoft/teams-js";
import { sp } from "@pnp/sp/presets/all";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import { IItemAddResult } from "@pnp/sp/items";
import { SharePointDataServicesService } from "../services/share-point-data-services.service";
import { DataService } from "../services/data.service";
import { GraphService } from "../services/graph.service";
import { User } from "../models/User";

export interface IEvent {
  subject: string;
  organizer?: string;
  start?: string;
  end?: string;
}

export interface IEventColl {
  value: IEvent[];
}

@Component({
  selector: "app-powermeet-web-part",
  templateUrl: "./powermeet-web-part.component.html",
  styleUrls: ["./powermeet-web-part.component.css"],
  encapsulation: ViewEncapsulation.Emulated,
})
export class PowermeetWebPartComponent implements OnInit {
  @Input() description: any;
  @Input() user: any;
  @Input() group: any;
  @Input() siteUrl: any;
  // private _teamsContext: microsoftTeams.Context;
  constructor(
    private graphService: GraphService,
    private dataService: DataService
  ) {
    sessionStorage.setItem("subEntityId", "");
    microsoftTeams.initialize();
    microsoftTeams.getContext(function (context) {
      console.log("team context", context);
      console.log("subEntityId", context.subEntityId);
      sessionStorage.setItem("subEntityId", context.subEntityId);
    });
  }

  ngOnInit() {
    this.getGraphUsers();
  }
  getGraphUsers() {
    this.graphService.getUsers().then((res) => {
      console.log("users list response ", res);
      const users = new Array<User>();
      res.forEach((x) => {
        const user = new User();
        user.id = x.id;
        user.fullname = x.displayName;
        user.email = x.userPrincipalName;
        user.displayName = x.givenName.slice(0, 1) + x.surname.slice(0, 1);
        user.card = `<div class="card" style="width: 18rem;border: none;text-align: left;"><h6>${user.fullname}</h6><p>${user.email}</p></div>`;
        this.graphService
          .getUserProfile(x.userPrincipalName)
          .then((res) => {
            if (res) {
              let reader = new FileReader();
              reader.addEventListener(
                "load",
                () => {
                  user.file = reader.result;
                  user.status = true;
                },
                false
              );
              if (res) {
                reader.readAsDataURL(res);
              }
            }
          })
          .catch((error) => {
            console.log("error", error);
            user.status = false;
          });
        users.push(user);
      });
      this.dataService.updatedDataSelection(users);
    });
  }
  ngAfterViewInit() {
    sessionStorage.setItem('authconfig', this.description);
    sessionStorage.setItem('user', this.user);
    sessionStorage.setItem('groupId', this.group);

    // sessionStorage.setItem(
    //   "authconfig",
    //   "eyJ0eXAiOiJKV1QiLCJub25jZSI6IjlnbEx4VG1EamFTTUdCSGV5R3RUeHA3ek1BdkZNVVVYZXVlZ1JUNWJ1cW8iLCJhbGciOiJSUzI1NiIsIng1dCI6ImppYk5ia0ZTU2JteFBZck45Q0ZxUms0SzRndyIsImtpZCI6ImppYk5ia0ZTU2JteFBZck45Q0ZxUms0SzRndyJ9.eyJhdWQiOiJodHRwczovL2dyYXBoLm1pY3Jvc29mdC5jb20iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC84NGE5ODQzYi0wYjI5LTQ3MjktYmE4YS04MTU1Y2Y1NWM3YWUvIiwiaWF0IjoxNTk4OTcwMDgxLCJuYmYiOjE1OTg5NzAwODEsImV4cCI6MTU5ODk3Mzk4MSwiYWNjdCI6MCwiYWNyIjoiMSIsImFpbyI6IkFTUUEyLzhRQUFBQWwySGtkWU5OUUIrb1VkR0l0Y3VvdS9OandyRXlBUTI1Y29qU2U5bXlhYUk9IiwiYW1yIjpbInB3ZCJdLCJhcHBfZGlzcGxheW5hbWUiOiJTaGFyZVBvaW50IE9ubGluZSBDbGllbnQgRXh0ZW5zaWJpbGl0eSBXZWIgQXBwbGljYXRpb24gUHJpbmNpcGFsIiwiYXBwaWQiOiI2OGU2OTRlMy01NGE3LTQzNjQtYWQ0ZS01YjdkZWVmOGM5OGIiLCJhcHBpZGFjciI6IjAiLCJmYW1pbHlfbmFtZSI6Ikt1bWFyIiwiZ2l2ZW5fbmFtZSI6IlZpbmF5IiwiaGFzd2lkcyI6InRydWUiLCJpZHR5cCI6InVzZXIiLCJpcGFkZHIiOiIxNTcuNDEuNzcuMTAzIiwibmFtZSI6IlZpbmF5IEt1bWFyIiwib2lkIjoiMDNlNmFjOGMtNjUzZS00YmU4LTljMGMtZDg3ODNiMWNhZmMwIiwicGxhdGYiOiIzIiwicHVpZCI6IjEwMDMyMDAwOUFGNTEwREYiLCJyaCI6IjAuQUFBQU80U3BoQ2tMS1VlNmlvRlZ6MVhIcnVPVTVtaW5WR1JEclU1YmZlNzR5WXRLQU9VLiIsInNjcCI6IkNhbGVuZGFycy5SZWFkIENhbGVuZGFycy5SZWFkV3JpdGUgQ2hhbm5lbE1lc3NhZ2UuU2VuZCBHcm91cC5SZWFkLkFsbCBHcm91cC5SZWFkV3JpdGUuQWxsIFByZXNlbmNlLlJlYWQuQWxsIFNpdGVzLlJlYWRXcml0ZS5BbGwgVXNlci5SZWFkLkFsbCBVc2VyLlJlYWRCYXNpYy5BbGwiLCJzaWduaW5fc3RhdGUiOlsia21zaSJdLCJzdWIiOiIzckJ2SXdHemRiS1VwdExEbzlqSFNFMTZEeDVVQk9wTDFZN2stXzlrZldrIiwidGVuYW50X3JlZ2lvbl9zY29wZSI6IkFTIiwidGlkIjoiODRhOTg0M2ItMGIyOS00NzI5LWJhOGEtODE1NWNmNTVjN2FlIiwidW5pcXVlX25hbWUiOiJ2aW5heS5rdW1hckBzdGljc29mdC5pbyIsInVwbiI6InZpbmF5Lmt1bWFyQHN0aWNzb2Z0LmlvIiwidXRpIjoiTW4xUzVUb1k5azZyNkhfc0xla3JBQSIsInZlciI6IjEuMCIsInhtc190Y2R0IjoxNTgxNTA3NDgzfQ.hbo50vl-TYoVCrTux_cze5Ap-wPMW5TXAwe0aS5Iln9suyLy4ZdWUeLjWtmVbMZhxyUC9a6X1vFnbO47pREydpDE0lDPZcJ__2G1EToX28ldNx6dhrgI4wZ4dwKYijLjMBB7Zy-8NrvWIDDorwaUsP0e35K-kDL7P0fAT9KTVMVfz-03w5L1tYL87q7U63628PKYxdDVEAU0lnlgZdWgNs3Q0w26UnS_O5ZPAIg_T9y7acaOhLy1pMFzh7o9ijXM0RnpdWwlGHIVUby5SgSipGYCffQMl_OVRcK_dh2yJmoXv1YqNakDeY8uL9kQFhVon1g-rtT6-e3G_kcvitdwjQ"
    // );
    // sessionStorage.setItem("user", "vinay.kumar@sticsoft.io");
    // // sessionStorage.setItem("user", "santhosh.addagulla@sticsoft.io");
    // sessionStorage.setItem("groupId", "54b63089-c127-4cd9-9dd5-72013c0c3eaa");

    // sessionStorage.setItem('channelId', "19:66897d02aa6745428f4c8117cc197f39@thread.tacv2a");

    (<HTMLAnchorElement>document.getElementById("dashboard")).click();
  }
}
