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

type Tab = "surah" | "juz" | "halaman";

export default defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const storage = useLocalStorage();
    const chapters = useChapters();
    const { t } = useI18n();

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

    if (["surah", "juz", "halaman"].includes(route.query.tab as string)) {
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

    // ===== Fitur Grup dan Teman dalam 1 Card =====
    // Tab aktif antara "groups" dan "friends"
    const activeCardTab = ref<"groups" | "friends">("groups");

    // State untuk minimize Card (default: minimized)
    const isCardMinimized = ref(true);

    // Data dinamis untuk grup dan teman
    const groups = ref([
      {
        id: 1,
        name: "Grup Tes Statis",
        members: ["Ahmad", "Budi"],
        open: false,
      },
    ]);
    const friends = ref(["Andi", "Budi"]);

    // Fungsi untuk menambah grup baru
    const newGroupName = ref("");
    function addGroup() {
      if (newGroupName.value.trim() === "") {
        toast.error("Nama grup tidak boleh kosong");
        return;
      }
      const newId = groups.value.length ? Math.max(...groups.value.map(g => g.id)) + 1 : 1;
      groups.value.push({
        id: newId,
        name: newGroupName.value,
        members: [],
        open: false,
      });
      newGroupName.value = "";
      toast.success("Grup berhasil ditambahkan");
    }

    // Fungsi untuk menghapus grup
    function deleteGroup(id: number) {
      groups.value = groups.value.filter((group) => group.id !== id);
      toast.success("Grup berhasil dihapus");
    }

    // Fungsi toggle untuk buka/tutup daftar member grup
    function toggleGroup(id: number) {
      groups.value = groups.value.map((group) => {
        if (group.id === id) {
          return { ...group, open: !group.open };
        }
        return group;
      });
    }

    // Menambah anggota ke grup (memilih dari daftar teman)
    function addMemberToGroup(groupId: number, friend: string) {
      groups.value = groups.value.map((group) => {
        if (group.id === groupId) {
          if (!group.members.includes(friend)) {
            return { ...group, members: [...group.members, friend] };
          } else {
            toast.info(`${friend} sudah ada di grup`);
          }
        }
        return group;
      });
    }

    // Menghapus anggota dari grup
    function removeMemberFromGroup(groupId: number, member: string) {
      groups.value = groups.value.map((group) => {
        if (group.id === groupId) {
          return { ...group, members: group.members.filter((m) => m !== member) };
        }
        return group;
      });
      toast.success(`${member} telah dihapus dari grup`);
    }

    // Menambah pertemanan baru
    const newFriendName = ref("");
    function addFriend() {
      const name = newFriendName.value.trim();
      if (name === "") {
        toast.error("Nama teman tidak boleh kosong");
        return;
      }
      if (["Liko", "Galang"].includes(name)) {
        toast.error("Pengguna tidak ditemukan");
        return;
      }
      if (!friends.value.includes(name)) {
        friends.value.push(name);
        newFriendName.value = "";
        toast.success("Pengguna ditemukan dan berhasil ditambahkan");
      } else {
        toast.info("Teman sudah ada");
      }
    }

    // Menghapus pertemanan (unfriend)
    function removeFriend(friend: string) {
      friends.value = friends.value.filter((f) => f !== friend);
      toast.success("Teman telah dihapus");
    }

    // Fungsi invite untuk demo
    function invite(item: string) {
      toast.success(`${item} diundang untuk membaca bersama!`);
    }

    return {
      tab,
      sort,
      bookmarks,
      halamanInput,
      isInputFilled,
      navigateToSurah,
      // Untuk tab grup/teman
      activeCardTab,
      isCardMinimized,
      groups,
      friends,
      newGroupName,
      addGroup,
      deleteGroup,
      toggleGroup,
      addMemberToGroup,
      removeMemberFromGroup,
      newFriendName,
      addFriend,
      removeFriend,
      invite,
      t,
    };
  },
  render() {
    return (
      <MainLayout>
        {/* Card untuk Grup & Teman dengan Tab dan fitur minimize (default: minimize) */}
        <Card class="mb-3 bg-primary " headerClasses="text-center">
          {{
            header: () => (
              <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex gap-2">
                  <button
                    class={["btn", this.activeCardTab === "groups" ? "btn-success" : "text-white"]}
                    onClick={() => (this.activeCardTab = "groups")}
                  >
                    {this.t("general.group")}
                  </button>
                  <button
                    class={["btn", this.activeCardTab === "friends" ? "btn-success" : "text-white"]}
                    onClick={() => (this.activeCardTab = "friends")}
                  >
                    {this.t("general.friends")}
                  </button>
                </div>
                <button 
  class={`btn ${this.$setting.isDarkMode ? "btn-dark text-white" : "btn-light text-dark"}`}
  onClick={() => { this.isCardMinimized = !this.isCardMinimized; }}
>
  {this.isCardMinimized ? this.t("general.besar") : this.t("general.kecil")}
</button>

              </div>
            ),
            default: () =>
              !this.isCardMinimized && (
                <div class="p-3">
                  {/* Tampilan untuk Grup */}
                  {this.activeCardTab === "groups" && (
                    <div>
                      {/* Form tambah grup */}
                      <div class="mb-3 d-flex gap-2">
                        <input
                          type="text"
                          class="form-control"
                          placeholder={this.t("general.new_group")}
                          value={this.newGroupName}
                          onInput={(e: Event) => {
                            const inputEl = e.target as HTMLInputElement;
                            this.newGroupName = inputEl.value;
                          }}
                        />
                        <button class="btn btn-success" onClick={this.addGroup}>
                          {this.t("general.add_group")}
                        </button>
                      </div>
                      {this.groups.map((group) => (
                        <div key={group.id} class="mb-3 border-bottom pb-2 text-light">
                          <div
                            class="d-flex justify-content-between align-items-center cursor-pointer"
                            onClick={() => this.toggleGroup(group.id)}
                          >
                            <span>{group.name}</span>
                            <div class="d-flex gap-2">
                              <button
                                class="btn btn-light"
                                style="width: 40px; height: 40px; border-radius: 50%; padding: 0;"
                                onClick={(e: Event) => {
                                  e.stopPropagation();
                                  this.invite(group.name);
                                }}
                              >
                                <font-awesome-icon icon="plus" />
                              </button>
                              <button
                                class="btn btn-warning"
                                style="width: 40px; height: 40px; border-radius: 50%; padding: 0;"
                                onClick={(e: Event) => {
                                  e.stopPropagation();
                                  this.deleteGroup(group.id);
                                }}
                              >
                                <font-awesome-icon icon="trash" />
                              </button>
                            </div>
                          </div>
                          {group.open && (
                            <div class="mt-2 ms-3">
                              <div class="fw-bold ">{this.t("general.member")}</div>
                              <ul class="list-unstyled mb-0">
                                {group.members.map((member, idx) => (
                                  <li key={idx} class="d-flex justify-content-between align-items-center text-light">
                                    <span>{member}</span>
                                    <div class="d-flex gap-2">
                                      <button
                                        class="btn btn-warning my-1"
                                        style="width: 30px; height: 30px; border-radius: 50%; padding: 0;"
                                        onClick={() => this.removeMemberFromGroup(group.id, member)}
                                      >
                                        <font-awesome-icon icon="minus" />
                                      </button>
                                      <button
                                        class="btn btn-light my-1"
                                        style="width: 30px; height: 30px; border-radius: 50%; padding: 0;"
                                        onClick={(e: Event) => {
                                          e.stopPropagation();
                                          this.invite(member);
                                        }}
                                      >
                                        <font-awesome-icon icon="plus" />
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              {/* Form untuk menambah member dari daftar teman */}
                              <div class="mt-2 d-flex gap-2">
                                <select
                                  class="form-select"
                                  style="max-width: 200px;"
                                  onChange={(e: Event) => {
                                    const sel = e.target as HTMLSelectElement;
                                    const friend = sel.value;
                                    if (friend !== "") {
                                      this.addMemberToGroup(group.id, friend);
                                      sel.selectedIndex = 0;
                                    }
                                  }}
                                >
                                  <option value="">{this.t("general.select_friend")}</option>
                                  {this.friends.map((friend, idx) => (
                                    <option key={idx} value={friend}>
                                      {friend}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tampilan untuk Teman */}
                  {this.activeCardTab === "friends" && (
                    <div>
                      {/* Form tambah teman */}
                      <div class="mb-3 d-flex gap-2">
                        <input
                          type="text"
                          class="form-control"
                          placeholder={this.t("general.new_friend")}
                          value={this.newFriendName}
                          onInput={(e: Event) => {
                            const inputEl = e.target as HTMLInputElement;
                            this.newFriendName = inputEl.value;
                          }}
                        />
                        <button class="btn btn-success" onClick={this.addFriend}>
                          {this.t("general.add_friend")}
                        </button>
                      </div>
                      <ul class="list-unstyled">
                        {this.friends.map((friend, idx) => (
                          <li key={idx} class="d-flex justify-content-between align-items-center mb-2 text-light">
                            <span>{friend}</span>
                            <div class="d-flex gap-2">
                              <button
                                class="btn btn-warning"
                                style="width: 40px; height: 40px; border-radius: 50%; padding: 0;"
                                onClick={() => this.removeFriend(friend)}
                              >
                                <font-awesome-icon icon="minus" />
                              </button>
                              <button
                                class="btn btn-light"
                                style="width: 40px; height: 40px; border-radius: 50%; padding: 0;"
                                onClick={(e: Event) => {
                                  e.stopPropagation();
                                  this.invite(friend);
                                }}
                              >
                                <font-awesome-icon icon="plus" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ),
          }}
        </Card>

        {/* Card Favorit Surah */}
        <Card 
        class={["mb-4 text-white"  ,
          { "bg-white": !this.$setting.isDarkMode },]}
        headerClasses="d-flex justify-content-between bg-primary" >
          {{
            header: () => (
              <div class="card-title my-auto"  >
                <div class="text-center font-bold text-lg" >
                  {this.t("general.surahfavorite")}
                </div>
              </div>
            ),
            default: () => (
              <div class="row custom-scrollbar" style="overflow-x: hidden; max-height: 200px">
                <div class="card-title my-auto d-flex flex-wrap gap-2 justify-center" >
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

        <div class="d-flex justify-content-between mb-3">
          <ul class="nav nav-pills mb-3">
            <li class="nav-item" onClick={() => (this.tab = "surah")}>
              <div class={["nav-link cursor-pointer", { active: this.tab == "surah" }]}>
                {this.t("general.surah")}
              </div>
            </li>
            <li class="nav-item" onClick={() => (this.tab = "juz")}>
              <div class={["nav-link cursor-pointer", { active: this.tab == "juz" }]}>
                {this.t("general.juz")}
              </div>
            </li>
            <li class="nav-item" onClick={() => (this.tab = "halaman")}>
              <div class={["nav-link cursor-pointer", { active: this.tab == "halaman" }]}>
                {this.t("general.halaman")}
              </div>
            </li>
          </ul>
          {this.tab !== "halaman" && (
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
        {this.tab === "halaman" && (
          <div class="mb-4">
            <div class="input-group" style="max-width: 350px;">
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
        )}
        {this.tab === "surah"
          ? h(Surah, { sort: this.sort })
          : this.tab === "juz"
          ? h(Juz, { sort: this.sort })
          : this.tab === "halaman"
          ? h("div", {}, "")
          : null}
      </MainLayout>
    );
  },
});
