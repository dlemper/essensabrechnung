<template>
  <section class="has-padding-top">
    <div class="container">
      <div class="columns is-mobile is-centered">
        <div class="column is-narrow">
          <b-field>
            <b-checkbox-button
              v-for="item in weekDayNames"
              :key="weekDayNames.indexOf(item)"
              v-model="checkboxGroup"
              :native-value="item.index"
            >
              {{ item.day }}
            </b-checkbox-button>
          </b-field>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="columns is-mobile is-centered">
        <div class="column is-narrow">
          <b-datepicker
            v-model="dates"
            inline
            :unselectable-days-of-week="[0, 6]"
            :first-day-of-week="1"
            indicators="bars"
            :events="events"
            :mobile-native="false"
            :show-week-number="!isMobile"
            :month-names="monthNames"
            :day-names="dayNames"
            :min-date="minDate"
            :max-date="maxDate"
            range
          />
        </div>
      </div>
    </div>
    <div class="container">
      <div class="columns is-mobile is-centered">
        <div class="column is-narrow">
          <p><b>Von:</b> {{ dates[0] | date }}</p>
        </div>
        <div class="column is-narrow">
          <p><b>Bis:</b> {{ dates[1] | date }}</p>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="columns is-mobile is-centered">
        <div class="column is-narrow has-text-right">
          <b-field label="Einzelbetrag" label-position="on-border">
            <b-input
              v-model="einzelbetrag"
              type="number"
              min="0"
              step="0.1"
              icon="euro-sign"
            />
          </b-field>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="columns is-mobile is-centered">
        <div class="column is-narrow">
          <p><b>Tage:</b> {{ dayCountInFilteredRange }}</p>
        </div>
        <div class="column is-narrow">
          <p><b>Betrag:</b> {{ gesamtbetrag | euro }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import locale from "date-fns/esm/locale/de";
import { getDay, eachDayOfInterval, parseISO, lastDayOfYear } from "date-fns";

export default {
  name: "app",
  data() {
    return {
      feiertage: [],
      ferien: [],
      bundesland: "NI",
      checkboxGroup: [],
      dates: [],
      einzelbetrag: 0.0,
    };
  },
  computed: {
    isMobile() {
      return window.innerWidth <= 768;
    },
    minDate() {
      return this.years.length > 0 ? new Date(this.years[0], 0) : undefined;
    },
    maxDate() {
      return this.years.length > 0
        ? lastDayOfYear(new Date(this.years[this.years.length - 1], 0))
        : undefined;
    },
    years() {
      const currentYear = new Date().getFullYear();

      return [currentYear - 1, currentYear, currentYear + 1];
    },
    gesamtbetrag() {
      return this.einzelbetrag * this.dayCountInFilteredRange;
    },
    events() {
      return [...this.feiertage, ...this.ferien];
    },
    dayNames() {
      return [...Array(7).keys()]
        .map((i) => locale.localize.day(i, { width: "abbreviated" }))
        .map((n) => n.replace(".", ""));
    },
    monthNames() {
      return [...Array(12).keys()].map((i) =>
        locale.localize.month(i, { width: "wide" })
      );
    },
    weekDayNames() {
      return this.dayNames
        .map((day, index) => ({ day, index }))
        .filter((items, index) => index !== 0 && index !== 6);
    },
    dayCountInFilteredRange() {
      if (this.dates.length > 0) {
        /*console.log(
          "filtered",
          this.feiertage.map(day => lightFormat(day, "yyyy-MM-dd")),
          eachDayOfInterval({
            start: this.dates[0],
            end: this.dates[1]
          })
            .filter(day => this.checkboxGroup.includes(getDay(day)))
            .map(day => lightFormat(day, "yyyy-MM-dd"))
            .filter(
              day =>
                !this.feiertage
                  .map(day => lightFormat(day, "yyyy-MM-dd"))
                  .includes(day)
            )
            .filter(
              day =>
                !this.ferien
                  .map(day => lightFormat(day, "yyyy-MM-dd"))
                  .includes(day)
            )
        );*/
        return eachDayOfInterval({ start: this.dates[0], end: this.dates[1] })
          .filter((day) => this.checkboxGroup.includes(getDay(day)))
          .filter((day) => this.feiertage.map(Number).indexOf(+day) === -1)
          .filter((day) => this.ferien.map(Number).indexOf(+day) === -1).length;
      }

      return 0;
    },
  },
  mounted() {
    Promise.all(
      this.years.map((year) =>
        fetch(
          `https://feiertage-api.de/api/?jahr=${year}&nur_land=${this.bundesland}`
        )
      )
    )
      .then((years) => {
        years.forEach(async (year) => {
          if (year.ok) {
            const tage = await year.json();
            this.feiertage.push(
              ...Object.values(tage).map((tag) => parseISO(tag.datum))
            );
          }
        });
      })
      .catch(console.error); // eslint-disable-line no-console

    Promise.all(
      this.years.map((year) =>
        fetch(
          `https://cors-anywhere.herokuapp.com/ferien-api.de/api/v1/holidays/${this.bundesland}/${year}`, // TODO: change, if ferien-api delivers cors headers
          {
            headers: {
              Origin: window.location.origin,
            },
          }
        )
      )
    )
      .then((years) => {
        years.forEach(async (year) => {
          if (year.ok) {
            const items = await year.json();
            this.ferien.push(
              ...Object.values(items)
                .map((item) =>
                  eachDayOfInterval({
                    start: parseISO(item.start),
                    end: parseISO(item.end),
                  })
                )
                .flat()
            );
          }
        });
      })
      .catch(console.error); // eslint-disable-line no-console
  },
  filters: {
    euro: function (value) {
      return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(value);
    },
    date(value) {
      return value
        ? Intl.DateTimeFormat(window.navigator.language, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(value)
        : "";
    },
  },
};
</script>

<style>
.has-padding-top {
  padding-top: 0.75rem;
}
</style>
