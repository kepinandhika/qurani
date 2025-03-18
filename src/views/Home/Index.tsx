import { computed, defineComponent, h, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useLocalStorage } from "@/hooks/storage";
import { useChapters } from "@/hooks/chapters";
import { useI18n } from "vue-i18n";
import { Bookmarks, Sort } from "@/types";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/Card/Card";
import Surah from "./Surah/Index";
import Juz from "./Juz/Index";
import historyReplaceState from "@/helpers/history-replace-state";
import collect from "collect.js";
import toast from "@/lib/toast";

type Tab = "surah" | "juz" | "page";

export default defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const storage = useLocalStorage();
    const chapters = useChapters();
    const { t } = useI18n();

    // Tab utama untuk konten Surah/Juz/Halaman
    const tab = ref<Tab>("surah");
    const sort = ref<Sort>("asc");
    const halamanInput = ref<string>("1");
    const isInputFilled = computed(() => halamanInput.value.trim() !== "");

    const bookmarks = computed<Bookmarks[]>(() => {
      const bookmark = storage.get("BOOKMARK", {});
      if (!bookmark || typeof bookmark !== "object") {
        return [];
      }
      return collect(Object.keys(bookmark))
        .map((verse) => {
          const chapterNumber = Number(verse.split(":")[0]);
          const chapter = chapters.find(chapterNumber);
          if (!isNaN(chapterNumber) && chapter) {
            return {
              id: verse.split(":")[0],
              verse: verse.split(":")[1],
              verse_key: verse,
              name: chapter.name_simple,
              created_at: bookmark[verse],
            };
          }
          return null;
        })
        .filter((item) => item !== null)
        .sortByDesc((item: Bookmarks) => item.created_at)
        .toArray();
    });

    if (["surah", "juz", "page"].includes(route.query.tab as string)) {
      tab.value = route.query.tab as Tab;
    }
    watch(tab, (value) => {
      historyReplaceState(null, { tab: value });
    });

    function navigateToSurah() {
      if (!isInputFilled.value) {
        toast.error("Nomor halaman tidak valid");
        return;
      }
      const pageNumber = parseInt(halamanInput.value, 10);
      if (!isNaN(pageNumber) && pageNumber > 0) {
        router.push({ name: "chapter", params: { id: pageNumber } });
      } else {
        toast.error("Nomor halaman tidak valid");
      }
    }

    // ===== Data untuk tab ekstra: Grup & Pengguna =====
    const groups = ref([
      {
        id: "a",
        name: "Ubig 2025",
        members: [
          { value: 7678, name: "Fatkul Amri" },
          { value: 9809, name: "Asrori" },
          { value: 9890, name: "Masum" },
          { value: 6236, name: "Dimas" },
          { value: 2354, name: "Richo" },
        ],
      },
      {
        id: "b",
        name: "Qurani 2025",
        members: [
          { value: 1221, name: "Galuh" },
          { value: 2827, name: "Kevin" },
          { value: 8723, name: "Dewa" },
          { value: 9012, name: "Niko" },
          { value: 8790, name: "Alvin" },
        ],
      },
    ]);
    const selectedGroup = ref("");
    const currentMembers = computed(() => {
      const group = groups.value.find((g) => g.id === selectedGroup.value);
      return group ? group.members : [];
    });

    // Untuk select anggota, kita simpan nilainya sebagai nama (agar konsisten dengan value option)
    const selectedMember = ref("");
    // Data statis untuk 5 pengguna; simpan juga nilainya sebagai nama
    const staticUsers = ref([
      { value: 4538, name: "Alfian" },
      { value: 7689, name: "Lang" },
      { value: 7109, name: "Naufal" },
      { value: 8145, name: "Fauzan" },
      { value: 9021, name: "Tito" },
    ]);
    const selectedUser = ref("");

    // Tab ekstra untuk mengatur tampilan Grup dan Pengguna
    const extraTab = ref<"grup" | "pengguna">("grup");

    // Computed property untuk mendapatkan nama peserta sesuai dengan tab aktif
    const selectedParticipant = computed(() => {
      return extraTab.value === "grup" ? selectedMember.value : selectedUser.value;
    });
    watch(selectedParticipant, (newVal) => {
      localStorage.setItem("participantName", newVal);
    });

    return {
      t,
      tab,
      sort,
      bookmarks,
      halamanInput,
      isInputFilled,
      navigateToSurah,
      extraTab,
      groups,
      selectedGroup,
      currentMembers,
      selectedMember,
      staticUsers,
      selectedUser,
      selectedParticipant,
    };
  },
  render() {
    return (
      <MainLayout>
        {/* Navigation Tab Ekstra untuk Grup dan Pengguna */}
        <div class="d-flex justify-content-start mb-3">
          <ul class="nav nav-pills">
            <li class="nav-item" onClick={() => (this.extraTab = "grup")}>
              <div class={["nav-link cursor-pointer", { active: this.extraTab === "grup" }]}>
                {this.t("general.group")}
              </div>
            </li>
            <li class="nav-item" onClick={() => (this.extraTab = "pengguna")}>
              <div class={["nav-link cursor-pointer", { active: this.extraTab === "pengguna" }]}>
                {this.t("general.users")}
              </div>
            </li>
          </ul>
        </div>

        {/* Konten berdasarkan Extra Tab */}
        {this.extraTab === "grup" ? (
          <div class="d-flex align-items-end gap-2 mb-3">
            <div>
              <label class="mb-1 d-block">{this.t("general.group")}</label>
              <select
                class="form-select"
                style="max-width:300px"
                value={this.selectedGroup}
                onChange={(e: Event) => {
                  const target = e.target as HTMLSelectElement;
                  this.selectedGroup = target.value;
                  // Reset pilihan anggota saat grup berubah
                  this.selectedMember = "";
                }}
              >
                <option value="">{this.t("general.agroup")}</option>
                {this.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label class="mb-1 d-block">{this.t("general.frien")}</label>
              <select
                class="form-select"
                style="max-width:300px"
                value={this.selectedMember}
                onChange={(e: Event) => {
                  const target = e.target as HTMLSelectElement;
                  // Karena kita ingin menampilkan nama yang terpilih, gunakan target.value
                  this.selectedMember = target.value;
                }}
              >
                <option value="">{this.t("general.frien")}</option>
                {this.currentMembers.map((member) => (
                  // Ubah value menjadi member.name agar konsisten
                  <option key={member.value} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div class="mb-3">
            <label class="mb-1 d-block">{this.t("general.users")}</label>
            <select
              class="form-select"
              style="max-width:200px"
              value={this.selectedUser}
              onChange={(e: Event) => {
                const target = e.target as HTMLSelectElement;
                // Simpan nilai sebagai nama
                this.selectedUser = target.value;
              }}
            >
              <option value="">{this.t("general.select_user")}</option>
              {this.staticUsers.map((user) => (
                <option key={user.value} value={user.name}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Card Favorit Surah */}
        <Card
          class={["mb-4 text-white", { "bg-white": !this.$setting.isDarkMode }]}
          headerClasses="d-flex justify-content-between bg-primary"
        >
          {{
            header: () => (
              <div class="card-title my-auto">
                <div class="text-center font-bold text-lg">
                  {this.t("general.surahfavorite")}
                </div>
              </div>
            ),
            default: () => (
              <div class="row custom-scrollbar" style="overflow-x: hidden; max-height: 200px">
                <div class="card-title my-auto d-flex flex-wrap gap-2 justify-center">
                  <router-link
                    to="/surah/36"
                    class="px-2 py-1 bg-warning rounded text-dark text-sm sm:text-base"
                  >
                    Yasin
                  </router-link>
                  <router-link
                    to="/surah/67"
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base"
                  >
                    Al-Mulk
                  </router-link>
                  <router-link
                    to="/surah/56"
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base"
                  >
                    Al-Waqi'ah
                  </router-link>
                  <router-link
                    to="/surah/18"
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base"
                  >
                    Al-Kahf
                  </router-link>
                  <router-link
                    to="/surah/78"
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base"
                  >
                    An-Naba
                  </router-link>
                  <router-link
                    to="/surah/2"
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base"
                  >
                    Al-Baqarah
                  </router-link>
                </div>
              </div>
            ),
          }}
        </Card>

        {/* Navigation Tab Utama untuk Surah, Juz, Halaman */}
        <div class="d-flex justify-content-between mb-3">
          <ul class="nav nav-pills mb-3">
            <li class="nav-item" onClick={() => (this.tab = "surah")}>
              <div class={["nav-link cursor-pointer", { active: this.tab === "surah" }]}>
                {this.t("general.surah")}
              </div>
            </li>
            <li class="nav-item" onClick={() => (this.tab = "juz")}>
              <div class={["nav-link cursor-pointer", { active: this.tab === "juz" }]}>
                {this.t("general.juz")}
              </div>
            </li>
            <li class="nav-item" onClick={() => (this.tab = "page")}>
              <div class={["nav-link cursor-pointer", { active: this.tab === "page" }]}>
                {this.t("general.halaman")}
              </div>
            </li>
          </ul>
          {this.tab !== "page" && this.tab !== "juz" && (
            <div class="my-auto">
              <small>
                <span class="me-2">{this.t("sort.by")}:</span>
                <span
                  class="text-primary cursor-pointer"
                  onClick={() => {
                    this.sort = this.sort === "desc" ? "asc" : "desc";
                  }}
                >
                  <span class="text-uppercase">{this.t(`sort.${this.sort}`)}</span>
                  <font-awesome-icon
                    icon={this.sort === "desc" ? "caret-down" : "caret-up"}
                    class="ms-1"
                  />
                </span>
              </small>
            </div>
          )}
        </div>

        {/* Konten Utama Berdasarkan Tab */}
        {this.tab === "page" ? (
          <div class="mb-4">
            <div class="input-group" style="max-width: 240px;">
              <input
                type="number"
                class="form-control"
                placeholder={this.t("general.nohalaman")}
                value={this.halamanInput}
                min="1"
                max="604"
                style="width: 3ch;"
                onInput={(e: Event) => {
                  const inputEl = e.target as HTMLInputElement;
                  let inputVal = inputEl.value.replace(/\D/g, "");
                  if (inputVal.length > 3) {
                    inputVal = inputVal.slice(0, 3);
                    inputEl.value = inputVal;
                  }
                  const num = parseInt(inputVal, 10);
                  if (!isNaN(num) && num > 604) {
                    inputVal = "604";
                    inputEl.value = inputVal;
                  }
                  this.halamanInput = inputVal;
                }}
                onKeyup={(e: KeyboardEvent) => {
                  if (e.key === "Enter") {
                    this.navigateToSurah();
                  }
                }}
              />
              <button class="btn btn-primary" disabled={!this.isInputFilled} onClick={this.navigateToSurah}>
                {this.t("general.gopage")}
              </button>
            </div>
          </div>
        ) : this.tab === "surah" ? (
          h(Surah, { sort: this.sort })
        ) : this.tab === "juz" ? (
          h(Juz, { sort: this.sort })
        ) : (
          h("div", {}, "")
        )}
      </MainLayout>
    );
  },
});
