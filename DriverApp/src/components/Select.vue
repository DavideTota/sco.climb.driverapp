<template>
  <ion-list>
    <ion-list-header>
      <ion-label>Seleziona</ion-label>
    </ion-list-header>
    <ion-item
      v-for="item in dataList"
      :key="item.name"
    >
      <ion-label @click="store(item.name)">{{ item.name }}</ion-label>
      <ion-icon :icon="chevronForward" slot="end"></ion-icon>
    </ion-item>
  </ion-list>
</template>

<script>
import axios from "axios";
import { chevronForward } from "ionicons/icons";
import { IonItem, IonLabel, IonList, IonListHeader, IonIcon } from "@ionic/vue";
import { defineComponent, ref } from "vue";

export default defineComponent({
  components: {
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonIcon,
  },
  setup() {
    const dataList = ref([]);

    const store = (name) => {
      localStorage.setItem(`${name}`, name);
      selection();
    };

    const call = async (data) => {
        dataList.value = [];
        try {
            const response = await axios.get(`src/tmp-data/${data}.json`);
            dataList.value = response.data;
            console.log(dataList.value)
        } catch (error) {
            console.error("Errore durante il recupero dei dati JSON:", error);
        }
    };

    const selection = () => {
      const itemCount = localStorage.length;
      if (itemCount === 0) {
        call("institute");
      } else if (itemCount === 1) {
        call("schools");
      } else {
        call("route");
      }
    };

    return { dataList, store, selection, chevronForward };
  },
  mounted() {
    this.selection();
  },
});
</script>
