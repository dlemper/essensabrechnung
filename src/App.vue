<template>
  <section class="has-padding-top">
    <div class="container">
      <div class="columns is-centered">
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
      <div class="columns is-centered">
        <div class="column is-narrow">
          <b-datepicker
            v-model="dates"
            inline
            :unselectable-days-of-week="[0, 6]"
            :first-day-of-week="1"
            indicators="bars"
            :events="events"
            :mobile-native="false"
            :show-number-week="true"
            :month-names="monthNames"
            :day-names="dayNames"
            range
          />
        </div>
      </div>
    </div>
    <div class="container">
      <div class="columns is-centered">
        <div class="column is-narrow">
          <p><b>Tage:</b> {{ dayCountInFilteredRange }}</p>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="columns is-centered">
        <div class="column is-narrow">
          <b-field label="Einzelbetrag">
            <b-input
              v-model="einzelbetrag"
              type="number"
              min="0"
              step="0.1"
            ></b-input>
          </b-field>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="columns is-centered">
        <div class="column is-narrow">
          <p><b>Gesamtbetrag:</b> {{ gesamtbetrag }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import locale from "date-fns/esm/locale/de";
import { getDay, eachDayOfInterval, parseISO, lightFormat } from "date-fns";

export default {
  name: "app",
  data() {
    return {
      feiertage: [],
      ferien: [],
      bundesland: "NI",
      checkboxGroup: [],
      dates: [],
      einzelbetrag: 0.0
    };
  },
  computed: {
    gesamtbetrag() {
      return this.einzelbetrag * this.dayCountInFilteredRange;
    },
    events() {
      console.log("events", [...this.feiertage, ...this.ferien]);
      return [...this.feiertage, ...this.ferien];
    },
    dayNames() {
      return [...Array(7).keys()]
        .map(i => locale.localize.day(i, { width: "abbreviated" }))
        .map(n => n.replace(".", ""));
    },
    monthNames() {
      return [...Array(12).keys()].map(i =>
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
        console.log(
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
        );
        return eachDayOfInterval({ start: this.dates[0], end: this.dates[1] })
          .filter(day => this.checkboxGroup.includes(getDay(day)))
          .filter(day => this.feiertage.map(Number).indexOf(+day) === -1)
          .filter(day => this.ferien.map(Number).indexOf(+day) === -1).length;
      }

      return 0;
    }
  },
  mounted() {
    const currentYear = new Date().getFullYear();

    Promise.all(
      [currentYear - 1, currentYear, currentYear + 1].map(year =>
        fetch(
          `https://feiertage-api.de/api/?jahr=${year}&nur_land=${this.bundesland}`
        )
      )
    )
      .then(years => {
        years.forEach(async year => {
          if (year.ok) {
            const tage = await year.json();
            this.feiertage.push(
              ...Object.values(tage).map(tag => parseISO(tag.datum))
            );
          }
        });
      })
      .catch(console.error); // eslint-disable-line no-console

    Promise.all(
      [currentYear - 1, currentYear, currentYear + 1].map(year =>
        fetch(
          `https://cors-anywhere.herokuapp.com/ferien-api.de/api/v1/holidays/${this.bundesland}/${year}` // TODO: change, if ferien-api delivers cors headers
        )
      )
    )
      .then(years => {
        years.forEach(async year => {
          if (year.ok) {
            const items = await year.json();
            this.ferien.push(
              ...Object.values(items)
                .map(item =>
                  eachDayOfInterval({
                    start: parseISO(item.start),
                    end: parseISO(item.end)
                  })
                )
                .flat()
            );
          }
        });
      })
      .catch(console.error); // eslint-disable-line no-console
  }
};
</script>

<style>
.has-padding-top {
  padding-top: 0.75rem;
}
</style>
