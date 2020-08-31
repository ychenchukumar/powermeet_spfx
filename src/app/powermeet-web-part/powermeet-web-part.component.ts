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
      "eyJ0eXAiOiJKV1QiLCJub25jZSI6IkxOcnFuSFg1STdPMUQyX0pQeGxTbDNudmprSngzdVdhR0VTZ01kd3h1M2siLCJhbGciOiJSUzI1NiIsIng1dCI6ImppYk5ia0ZTU2JteFBZck45Q0ZxUms0SzRndyIsImtpZCI6ImppYk5ia0ZTU2JteFBZck45Q0ZxUms0SzRndyJ9.eyJhdWQiOiJodHRwczovL2dyYXBoLm1pY3Jvc29mdC5jb20iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC84NGE5ODQzYi0wYjI5LTQ3MjktYmE4YS04MTU1Y2Y1NWM3YWUvIiwiaWF0IjoxNTk4ODg4OTE3LCJuYmYiOjE1OTg4ODg5MTcsImV4cCI6MTU5ODg5MjgxNywiYWNjdCI6MCwiYWNyIjoiMSIsImFpbyI6IkFTUUEyLzhRQUFBQU9mdWNoMWF4ck1zcmpXSFIxY0tWTENzRzljMCs5SmkvVjV0QVVQTVpOSDg9IiwiYW1yIjpbInB3ZCJdLCJhcHBfZGlzcGxheW5hbWUiOiJTaGFyZVBvaW50IE9ubGluZSBDbGllbnQgRXh0ZW5zaWJpbGl0eSBXZWIgQXBwbGljYXRpb24gUHJpbmNpcGFsIiwiYXBwaWQiOiI2OGU2OTRlMy01NGE3LTQzNjQtYWQ0ZS01YjdkZWVmOGM5OGIiLCJhcHBpZGFjciI6IjAiLCJmYW1pbHlfbmFtZSI6Ikt1bWFyIiwiZ2l2ZW5fbmFtZSI6IlZpbmF5IiwiaGFzd2lkcyI6InRydWUiLCJpZHR5cCI6InVzZXIiLCJpcGFkZHIiOiIxMDMuMTQzLjE2OC4xNTAiLCJuYW1lIjoiVmluYXkgS3VtYXIiLCJvaWQiOiIwM2U2YWM4Yy02NTNlLTRiZTgtOWMwYy1kODc4M2IxY2FmYzAiLCJwbGF0ZiI6IjMiLCJwdWlkIjoiMTAwMzIwMDA5QUY1MTBERiIsInJoIjoiMC5BQUFBTzRTcGhDa0xLVWU2aW9GVnoxWEhydU9VNW1pblZHUkRyVTViZmU3NHlZdEtBT1UuIiwic2NwIjoiQ2FsZW5kYXJzLlJlYWQgQ2FsZW5kYXJzLlJlYWRXcml0ZSBDaGFubmVsTWVzc2FnZS5TZW5kIEdyb3VwLlJlYWQuQWxsIEdyb3VwLlJlYWRXcml0ZS5BbGwgUHJlc2VuY2UuUmVhZC5BbGwgU2l0ZXMuUmVhZFdyaXRlLkFsbCBVc2VyLlJlYWQuQWxsIFVzZXIuUmVhZEJhc2ljLkFsbCIsInNpZ25pbl9zdGF0ZSI6WyJrbXNpIl0sInN1YiI6IjNyQnZJd0d6ZGJLVXB0TERvOWpIU0UxNkR4NVVCT3BMMVk3ay1fOWtmV2siLCJ0ZW5hbnRfcmVnaW9uX3Njb3BlIjoiQVMiLCJ0aWQiOiI4NGE5ODQzYi0wYjI5LTQ3MjktYmE4YS04MTU1Y2Y1NWM3YWUiLCJ1bmlxdWVfbmFtZSI6InZpbmF5Lmt1bWFyQHN0aWNzb2Z0LmlvIiwidXBuIjoidmluYXkua3VtYXJAc3RpY3NvZnQuaW8iLCJ1dGkiOiJJMTFIOGVtalhrdWQ1NkN5RlVZdUFRIiwidmVyIjoiMS4wIiwieG1zX3RjZHQiOjE1ODE1MDc0ODN9.gCRAYnSGlzYlRMn3L1-u_VW65iHPXyO5ejy6uiAJzG0UW3x5VxmHNWvjc8GYfCe_b2B8Js7oG1sUiSC61U0krSFFoQevG1e6U4BwMOveW6QOmzombfyNTRLMjxXisXs8xY8kokbeBPPYFzk4JLc1R6-3vLIUzE5HOo-0iS8W557QHM5XWlGzwdavbQCOJgOOeWGCg_h6RAU-xalNJOk6_5EnpU6iutj1OWTQXL8WlGt6G0usebcafyEmZ5MpFdn7tJx0xp9TUlvKhz1C-j01L1swlMDOeaYDh4UBMVj8aC70hRlrSr6XyPtmsNPQC_Op0bYKIPhk-TdKEeHNi3TTJQ"
    );
    sessionStorage.setItem("user", "vinay.kumar@sticsoft.io");
    sessionStorage.setItem("groupId", "54b63089-c127-4cd9-9dd5-72013c0c3eaa");

    // sessionStorage.setItem('channelId', "19:66897d02aa6745428f4c8117cc197f39@thread.tacv2a");

    (<HTMLAnchorElement>document.getElementById("dashboard")).click();
  }
}
