import {Component, HostListener} from '@angular/core';
import {TimerModel} from "../shared/models/timerModel";
import {TimeModel} from "../shared/models/timeModel";
import {StorageService} from "../core/storage/storage.service";
import {ToastService} from "../shared/class/toast/toast.service";
import {Platform} from "@ionic/angular";

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  public tabTimer: Array<TimerModel> = [
    {
      id: 1,
      name: 'Compteur 1',
      maxTime: 60
    }
  ];
  public tabTime: Array<TimeModel> = [
    {
      currentTime: 60,
      event: null
    }
  ];
  public pickerColumnsNumberTimer = [
    {
      name: 'nbTimer',
      options: Array.from({length: 10}, (_, index) => {
        return {
          text: (index + 1).toString(),
          value: index + 1
        }
      })
    }
  ];
  public isKeyActive = true;

  constructor(
    private storageService: StorageService,
    private toastService: ToastService,
    private platform: Platform
  ) {
  }

  ionViewWillEnter() {
    this.storageService.getConfig().then((config) => {
      if (config) {
        this.tabTimer = config;
        this.tabTime = [];
        config.forEach((timer) => {
          this.tabTime.push({
            currentTime: timer.maxTime,
            event: null
          });
        });
      } else {
        this.storageService.saveConfig(this.tabTimer).then();
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  keyDownFunction(event: any) {
    if (this.isKeyActive) {
      if (event.code === 'Space') {
        this.pauseAllTimer();
      } else if (event.code === 'Escape') {
        this.resetAllTimer();
      } else if (event.code === 'KeyS') {
        this.saveConfig();
      } else {
        const matchNb = event.code.match(/\d+/g);

        if (matchNb) {
          const nb = parseInt(matchNb[0]);
          if (nb <= this.tabTimer.length) {
            if (this.tabTime[nb - 1].event) {
              this.pauseTimer(this.tabTimer[nb - 1]);
            } else {
              this.launchTimer(this.tabTimer[nb - 1]);
            }
          }
        }
      }
    }
  }

  changeNbTimer(ev: any) {
    const nbTimer = ev.detail.data.nbTimer.value;
    if (nbTimer > this.tabTimer.length) {
      for (let i = this.tabTimer.length + 1; i <= nbTimer; i++) {
        this.tabTimer.push({
          id: i,
          name: 'Compteur ' + i,
          maxTime: 60
        });
        this.tabTime.push({
          currentTime: 60,
          event: null
        });
      }
    } else {
      for (let i = this.tabTimer.length; i > nbTimer; i--) {
        this.tabTimer.pop();
        this.tabTime.pop();
      }
    }
    this.isKeyActive = true;
  }

  editTimer(ev: any, timer: TimerModel) {
    if (ev.detail.role === 'confirm') {
      if (ev.detail.data.values[0] !== '') {
        timer.name = ev.detail.data.values[0];
      }

      if (ev.detail.data.values[1] !== '' && ev.detail.data.values[2] !== '') {
        timer.maxTime = parseInt(ev.detail.data.values[1]) * 60 + parseInt(ev.detail.data.values[2]);
      } else if (ev.detail.data.values[1] !== '') {
        const newMinutes = parseInt(ev.detail.data.values[1]);
        timer.maxTime = newMinutes * 60 + timer.maxTime % 60;
      } else if (ev.detail.data.values[2] !== '') {
        const newSeconds = parseInt(ev.detail.data.values[2]);
        timer.maxTime = this.getMinutesFromSeconds(timer.maxTime) * 60 + newSeconds;
      }

      this.tabTime[timer.id - 1].currentTime = timer.maxTime;
      this.toastService.presentToast({message: 'Compteur modifié', color: 'success'}).then();
    }
    this.isKeyActive = true;
  }

  deleteTimer(timer: TimerModel) {
    this.tabTimer.splice(timer.id - 1, 1);
    this.tabTime.splice(timer.id - 1, 1);
    this.tabTimer.forEach((timer, index) => {
      timer.id = index + 1;
    });
    this.tabTime.forEach((time, index) => {
      clearInterval(time.event);
      time.currentTime = this.tabTimer[index].maxTime;
    });
    this.toastService.presentToast({message: 'Compteur supprimé', color: 'success'}).then();
  }

  launchTimer(timer: TimerModel) {
    if (!this.tabTime[timer.id - 1].event) {
      const handler = () => {
        if (this.tabTime[timer.id - 1].currentTime <= 0) {
          clearInterval(this.tabTime[timer.id - 1].event);
        } else {
          this.tabTime[timer.id - 1].currentTime--;
        }
      }
      handler();
      this.tabTime[timer.id - 1].event = setInterval(handler, 1000);
    }
  }

  pauseTimer(timer: TimerModel) {
    if (this.tabTime[timer.id - 1].event) {
      clearInterval(this.tabTime[timer.id - 1].event);
      this.tabTime[timer.id - 1].event = null;
    }
  }

  resetTimer(timer: TimerModel) {
    this.pauseTimer(timer);
    this.tabTime[timer.id - 1].currentTime = timer.maxTime;
  }

  getMinutesFromSeconds(seconds: number): number {
    return Math.floor(seconds / 60);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  pauseAllTimer() {
    this.tabTime.forEach((time) => {
      clearInterval(time.event);
    });
  }

  resetAllTimer() {
    this.tabTime.forEach((time: TimeModel, index) => {
      this.resetTimer(this.tabTimer[index]);
    });
  }

  saveConfig() {
    this.storageService.saveConfig(this.tabTimer)
      .then(() => {
        this.toastService.presentToast({message: 'Configuration sauvegardée', color: 'success'}).then();
      })
      .catch(() => {
        this.toastService.presentToast({message: 'Erreur lors de la sauvegarde', color: 'danger'}).then();
      });
  }

  styleFooter() {
    // si l'on est sur mobile, on le positionne à la suite du contenu, sinon on le positionne en bas de l'écran
    if (this.platform.is('mobile')) {
      return {
        'margin-top': '5vh',
      }
    } else {
      return {
        'position': 'absolute',
        'bottom': '0',
        'width': '100%'
      }
    }
  }
}
