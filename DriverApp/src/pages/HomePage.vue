<template>
  <ion-content>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-icon
            v-if="breadCrumbs.length != 0"
            :icon="arrowBack"
            size="large"
            class="ion-padding-start"
          ></ion-icon>
        </ion-buttons>
        <ion-title>Configurazione percorso</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-toolbar v-if="breadCrumbs.length != 0">
      <ion-breadcrumbs class="scroll">
        <ion-breadcrumb v-for="breadCrumb in breadCrumbs" :key="breadCrumb">{{
          breadCrumb
        }}</ion-breadcrumb>
      </ion-breadcrumbs>
    </ion-toolbar>
    <ion-list v-if="breadCrumbs.length < 3">
      <ion-item v-for="item in dataList" :key="item.name">
        <ion-label @click="store(item.name)">{{ item.name }}</ion-label>
        <ion-icon :icon="chevronForward" slot="end"></ion-icon>
      </ion-item>
    </ion-list>

    <ion-list v-if="breadCrumbs.length === 3">
      <ion-list-header class="ion-padding">
        <ion-label>Seleziona</ion-label>
        <ion-buttons>
          <ion-button @click="popUp = true" fill="solid">Aggiungi</ion-button>
        </ion-buttons>
      </ion-list-header>
    </ion-list>
    <ion-header translucent v-if="popUp">
      <ion-toolbar>
          <ion-item v-for="item in dataList" :key="item.name">
            <ion-label>{{ item.name }}</ion-label>
          </ion-item>
      </ion-toolbar>
    </ion-header>
  </ion-content>
</template>

<script lang="ts">
import {
  IonTitle,
  IonContent,
  IonToolbar,
  IonBreadcrumbs,
  IonBreadcrumb,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonIcon,
  IonHeader,
  IonButtons,
  IonButton,
} from "@ionic/vue";
import { arrowBack, chevronForward } from "ionicons/icons";
import axios from "axios";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    IonTitle,
    IonContent,
    IonToolbar,
    IonBreadcrumbs,
    IonBreadcrumb,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonIcon,
    IonHeader,
    IonButtons,
    IonButton,
  },
  data() {
    return {
      dataList: [],
      breadCrumbs: [],
      chevronForward: chevronForward,
      arrowBack: arrowBack,
      popUp: false,
    };
  },
  methods: {
    call(data) {
      axios
        .get(`src/tmp-data/${data}.json`)
        .then((response) => {
          this.dataList = response.data;
        })
        .catch((error) => {
          console.error("Errore durante il recupero dei dati JSON:", error);
        });
    },
    selection() {
      const itemCount = localStorage.length;
      if (itemCount === 0) {
        this.call("institute");
      } else if (itemCount === 1) {
        this.call("schools");
      } else if (itemCount === 2) {
        this.call("route");
      } else {
        this.call("volunteers");
      }
    },
    store(name) {
      console.log(name);
      localStorage.setItem(`${name}`, name);
      this.breadCrumbs.push(name);
      this.selection();
    },
  },
  mounted() {
    this.selection();
    localStorage.clear();
  },
});
</script>

<style scoped>
.scroll {
  flex-wrap: nowrap;
  overflow-x: scroll !important;
}
.title {
  display: flex;
}
</style>
