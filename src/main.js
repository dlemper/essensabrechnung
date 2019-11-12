import Vue from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import Buefy from "buefy";
import "./assets/scss/app.scss";

Vue.use(Buefy, {
  defaultIconPack: "fas"
});

Vue.config.productionTip = false;

new Vue({
  render: h => h(App)
}).$mount("#app");
