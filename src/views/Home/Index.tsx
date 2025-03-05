import { computed, defineComponent, h } from "vue";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { Sort } from "@/types";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
import Tooltip from "@/components/Tooltip/Tooltip";
import Surah from "./Surah/Index";
import Juz from "./Juz/Index";
import historyReplaceState from "@/helpers/history-replace-state";

type Tab = "surah" | "juz";

export default defineComponent({
  setup() {
    const route = useRoute();
    const trans = useI18n();
    const tab = ref<Tab>("surah");
    const sort = ref<Sort>("asc");

    if (["surah", "juz"].includes(route.query.tab as string)) {
      tab.value = route.query.tab as Tab;
    }

    watch(tab, (value) => {
      historyReplaceState(null, { tab: value });
    });

    return {
      tab,
      sort,
    };
  },
  render() {
    return (
      <>
        <MainLayout>
          <div class="d-flex justify-content-between mb-3">
            <ul class="nav nav-pills mb-3">
              <li class="nav-item" onClick={() => (this.tab = "surah")}>
                <div
                  class={[
                    "nav-link cursor-pointer",
                    { active: this.tab == "surah" },
                  ]}
                >
                  {this.$t("general.surah")}
                </div>
              </li>
              <li class="nav-item" onClick={() => (this.tab = "juz")}>
                <div
                  class={[
                    "nav-link cursor-pointer",
                    { active: this.tab == "juz" },
                  ]}
                >
                  {this.$t("general.juz")}
                </div>
              </li>
            </ul>
            <div class="my-auto">
              <small>
                <span class="me-2">{this.$t("sort.by")}:</span>
                <span
                  class="text-primary cursor-pointer"
                  onClick={() => {
                    this.sort = this.sort == "desc" ? "asc" : "desc";
                  }}
                >
                  <span class="text-uppercase">
                    {this.$t(`sort.${this.sort}`)}
                  </span>
                  <font-awesome-icon
                    icon={this.sort == "desc" ? "caret-down" : "caret-up"}
                    class="ms-1"
                  />
                </span>
              </small>
            </div>
          </div>
          {h(this.tab == "surah" ? Surah : Juz, { sort: this.sort })}
        </MainLayout>
      </>
    );
  },
});
