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
    // sessionStorage.setItem('authconfig', this.description);
    // sessionStorage.setItem('user', this.user);
    // sessionStorage.setItem('groupId', this.group);

    sessionStorage.setItem(
      "authconfig",
      "eyJ0eXAiOiJKV1QiLCJub25jZSI6IkdzdWVsVFFJMlBsaEI4ckF3blgzQlFjQjMtSWhxZXlicUY2Wmd6Mmw4MzgiLCJhbGciOiJSUzI1NiIsIng1dCI6ImppYk5ia0ZTU2JteFBZck45Q0ZxUms0SzRndyIsImtpZCI6ImppYk5ia0ZTU2JteFBZck45Q0ZxUms0SzRndyJ9.eyJhdWQiOiJodHRwczovL2dyYXBoLm1pY3Jvc29mdC5jb20iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC84NGE5ODQzYi0wYjI5LTQ3MjktYmE4YS04MTU1Y2Y1NWM3YWUvIiwiaWF0IjoxNTk4OTY0NDAxLCJuYmYiOjE1OTg5NjQ0MDEsImV4cCI6MTU5ODk2ODMwMSwiYWNjdCI6MCwiYWNyIjoiMSIsImFpbyI6IkUyQmdZREE2MjdkT1IybitsaC9YUmZNcjNuMTlaR0hOcDh4eEtTbmF2c3p4UTRGMWpRTUEiLCJhbXIiOlsicHdkIl0sImFwcF9kaXNwbGF5bmFtZSI6IlNoYXJlUG9pbnQgT25saW5lIENsaWVudCBFeHRlbnNpYmlsaXR5IFdlYiBBcHBsaWNhdGlvbiBQcmluY2lwYWwiLCJhcHBpZCI6IjY4ZTY5NGUzLTU0YTctNDM2NC1hZDRlLTViN2RlZWY4Yzk4YiIsImFwcGlkYWNyIjoiMCIsImZhbWlseV9uYW1lIjoiS3VtYXIiLCJnaXZlbl9uYW1lIjoiVmluYXkiLCJoYXN3aWRzIjoidHJ1ZSIsImlkdHlwIjoidXNlciIsImlwYWRkciI6IjEwNi4yMDguMjQyLjEwMyIsIm5hbWUiOiJWaW5heSBLdW1hciIsIm9pZCI6IjAzZTZhYzhjLTY1M2UtNGJlOC05YzBjLWQ4NzgzYjFjYWZjMCIsInBsYXRmIjoiMyIsInB1aWQiOiIxMDAzMjAwMDlBRjUxMERGIiwicmgiOiIwLkFBQUFPNFNwaENrTEtVZTZpb0ZWejFYSHJ1T1U1bWluVkdSRHJVNWJmZTc0eVl0S0FPVS4iLCJzY3AiOiJDYWxlbmRhcnMuUmVhZCBDYWxlbmRhcnMuUmVhZFdyaXRlIENoYW5uZWxNZXNzYWdlLlNlbmQgR3JvdXAuUmVhZC5BbGwgR3JvdXAuUmVhZFdyaXRlLkFsbCBQcmVzZW5jZS5SZWFkLkFsbCBTaXRlcy5SZWFkV3JpdGUuQWxsIFVzZXIuUmVhZC5BbGwgVXNlci5SZWFkQmFzaWMuQWxsIiwic2lnbmluX3N0YXRlIjpbImttc2kiXSwic3ViIjoiM3JCdkl3R3pkYktVcHRMRG85akhTRTE2RHg1VUJPcEwxWTdrLV85a2ZXayIsInRlbmFudF9yZWdpb25fc2NvcGUiOiJBUyIsInRpZCI6Ijg0YTk4NDNiLTBiMjktNDcyOS1iYThhLTgxNTVjZjU1YzdhZSIsInVuaXF1ZV9uYW1lIjoidmluYXkua3VtYXJAc3RpY3NvZnQuaW8iLCJ1cG4iOiJ2aW5heS5rdW1hckBzdGljc29mdC5pbyIsInV0aSI6IkZKOHZrNzlCTGthMEprcjltZ3hsQUEiLCJ2ZXIiOiIxLjAiLCJ4bXNfdGNkdCI6MTU4MTUwNzQ4M30.zh-mhxlCEY6pvYC7TxrU_3Lm3IPSET8bfJlIYDm22OzXjEVNKQbcs20PI7aIz3Injqp94oKvdnOBOKbvJUGFvGwK5D24geeZ2S3UTVn4L7o5YssecjGC1Ftv_9YQmQPh57BsMPj7ZUubchXDtzKKDnDwYaunda-U9yulTVXOlRA8Q0D6e8Xg0c_fTkHgwjTWviOwjoD4_G7AErxWmCxhMxCr5Om8KUxWAgqLmuoJxJqWi9EoK0CFVrouGle52TrZ4v9qUr1QyVkALksdgpMl4FCwDPcGSbP-lzPiY7Ib_aVm1ShA2oToZCymZJ3P8hsryd7sFXb8b8QfqGtCVbBuPw"
    );
    // sessionStorage.setItem("user", "vinay.kumar@sticsoft.io");
    sessionStorage.setItem("user", "santhosh.addagulla@sticsoft.io");
    sessionStorage.setItem("groupId", "54b63089-c127-4cd9-9dd5-72013c0c3eaa");

    // sessionStorage.setItem('channelId', "19:66897d02aa6745428f4c8117cc197f39@thread.tacv2a");

    (<HTMLAnchorElement>document.getElementById("dashboard")).click();
  }
}
