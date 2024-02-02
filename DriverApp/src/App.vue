<template>
  <ion-app>
    <!-- menu -->
    <ion-menu class="menu" content-id="main-content">
      <ion-header>
        <ion-toolbar>
          <ion-title>Nome Cognome</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-item>
            <ion-icon :icon="people" slot="start"></ion-icon>
            <ion-label>Volontari</ion-label>
          </ion-item>
          <ion-item>
            <ion-icon :icon="bluetooth" slot="start"></ion-icon>
            <ion-label>Bluetooth</ion-label>
          </ion-item>
          <ion-item>
            <ion-icon :icon="logOut" slot="start"></ion-icon>
            <ion-label @click="clear()">Logout</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-menu>

    <!-- content -->
    <ion-page id="main-content">
      <!-- <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-menu-button></ion-menu-button>
          </ion-buttons>
          <ion-title>Menu</ion-title>
        </ion-toolbar>
      </ion-header> -->
      <ion-content class="ion-padding"><ion-router-outlet /></ion-content>
    </ion-page>
  </ion-app>
</template>

<script lang="ts">
import { people, logOut, bluetooth } from "ionicons/icons";
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenu,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  IonApp,
  IonRouterOutlet,
  IonList,
  IonIcon,
  IonLabel,
  IonItem,
} from "@ionic/vue";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    IonButtons,
    IonContent,
    IonHeader,
    IonMenu,
    IonList,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    IonApp,
    IonRouterOutlet,
    IonIcon,
    IonLabel,
    IonItem,
  },
  setup() {
    return { people, logOut, bluetooth };
  },
  methods: {
    clear () {
      localStorage.clear();
      location.reload();
    }
  }
});
</script>

<style>
.menu {
  z-index: 100000 !important;
}
</style>
