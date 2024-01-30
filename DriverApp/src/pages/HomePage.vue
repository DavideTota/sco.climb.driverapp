<template>
    <ion-content>
      <!-- <ion-toolbar>
        <ion-breadcrumbs class="scroll">
            <ion-breadcrumb>Istituto Lorem Ipsum</ion-breadcrumb>
            <ion-breadcrumb>Scuola Lorem Ipsum</ion-breadcrumb>
            <ion-breadcrumb>Linea Lorem Ipsum</ion-breadcrumb>
            <ion-breadcrumb></ion-breadcrumb>
          </ion-breadcrumbs>
      </ion-toolbar> -->
      <Select />
    </ion-content>
  </template>
  
  <script lang="ts">
  import {
    IonContent,
    IonToolbar,
    IonBreadcrumbs,
    IonBreadcrumb,
  } from "@ionic/vue";
  import { defineComponent } from "vue";
  import Select from '../components/Select.vue';
  
  export default defineComponent({
    components: {
        IonContent,
        IonToolbar,
        IonBreadcrumbs,
        IonBreadcrumb,
        Select
    },
    methods: {
        
    }
  });
  </script>
  
  <style scoped>
  .scroll {
    flex-wrap: nowrap;
    overflow-x: scroll !important;
    overflow-y: hidden;
  }
  </style>
  