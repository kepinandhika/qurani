import { computed, defineComponent, Transition, watch, ref, onMounted, nextTick } from "vue";
import { LocaleCode } from "@/types";
import styles from "./Setting.module.scss";
import scroll from "@/helpers/scroll";
import Button from "@/components/Button/Button";
import Checkbox from "../Input/Checkbox";
import UsePwa, { DefaultSlotProps } from "../PWA/UsePwa";
import Range from "../Input/Range";
import { useEventListener } from "@vueuse/core";
import { FontType } from "@/hooks/settings";

export default defineComponent({
  emits: {
    "update:show": (value: boolean) => true
  },
  props: {
    show: {
      type: Boolean
    }
  },
  setup(props, { emit }) {
    const scaleFitures = ref<boolean>(isSupportScale());
    const shouldShow = computed<boolean>({
      set(value) {
        emit("update:show", value);
      },
      get() {
        return Boolean(props.show);
      }
    });

    function isSupportScale() {
      const touchDevice = (navigator.maxTouchPoints || "ontouchstart" in document.documentElement);
      const mobile = /iPhone|iPad|iPod|Android|webOS/i.test(navigator.userAgent);
      return Boolean(touchDevice && mobile);
    }

    useEventListener(window, "resize", () => {
      scaleFitures.value = isSupportScale();
    });

    watch(shouldShow, (show) => {
      show ? scroll.disable() : scroll.enable();
    }, { immediate: true });

    // Daftar warna default untuk kesalahan
    const defaultErrorColors = {
      'Gharib': '#CCCCCC',
      'Ghunnah': '#99CCFF',
      'Harokat Tertukar': '#DFF18F',
      'Huruf Tambah/Kurang': '#F4ACB6',
      'Lupa (tidak dibaca)': '#FA7656',
      'Mad (panjang pendek)': '#FFCC99',
      'Makhroj (pengucapan huruf)': '#F4A384',
      'Nun Mati dan Tanwin': '#F8DD74',
      'Qalqalah (memantul)': '#D5B6D4',
      'Tasydid (penekanan)': '#B5C9DF',
      'Urutan Huruf atau Kata': '#FE7D8F',
      'Waqof atau Washol (berhenti atau lanjut)': '#A1D4CF',
      'Waqof dan Ibtida (berhenti dan memulai)': '#90CBAA',
      'Lainnya': '#CC99CC',
      'Ayat Lupa (tidak dibaca)': '#FA7656',
      'Ayat Waqof atau Washol (berhenti atau lanjut)': '#FE7D8F',
      'Ayat Waqof dan Ibtida (berhenti dan memulai)': '#90CBAA'
    };

    // errorColors reactive
    const errorColors = ref<Record<string, string>>({ ...defaultErrorColors });

    // Reactive object untuk status centang tiap kesalahan
    const checkedErrors = ref<Record<string, boolean>>({});

    // Reactive object untuk menyimpan custom label yang dapat diedit
    const customLabels = ref<Record<string, string>>({});

    // Variabel untuk menandai label yang sedang dalam mode edit
    const editingLabel = ref<string | null>(null);

    // Muat data dari localStorage saat komponen dimuat
    onMounted(() => {
      const storedColors = localStorage.getItem("errorColors");
      if (storedColors) {
        errorColors.value = JSON.parse(storedColors);
      }
      const storedChecked = localStorage.getItem("checkedErrors");
      if (storedChecked) {
        checkedErrors.value = JSON.parse(storedChecked);
      } else {
        Object.keys(errorColors.value).forEach(label => {
          checkedErrors.value[label] = true;
        });
      }
      const storedLabels = localStorage.getItem("customLabels");
      if (storedLabels) {
        customLabels.value = JSON.parse(storedLabels);
      } else {
        Object.keys(errorColors.value).forEach(label => {
          customLabels.value[label] = label;
        });
      }
    });

    // Watchers untuk menyimpan data ke localStorage
    watch(errorColors, (newVal) => {
      localStorage.setItem("errorColors", JSON.stringify(newVal));
    }, { deep: true });

    watch(checkedErrors, (newVal) => {
      localStorage.setItem("checkedErrors", JSON.stringify(newVal));
    }, { deep: true });

    watch(customLabels, (newVal) => {
      localStorage.setItem("customLabels", JSON.stringify(newVal));
    }, { deep: true });

    return {
      shouldShow,
      scaleFitures,
      errorColors,
      checkedErrors,
      customLabels,
      editingLabel,
      triggerNextTick: () => nextTick()
    }
  },
  render() {
    return (
      <Transition
        enterActiveClass={styles.animate_in}
        leaveActiveClass={styles.animate_out}
        onBeforeLeave={(el) => { el.classList.remove(styles.blur) }}
        onAfterEnter={(el) => { el.classList.add(styles.blur) }}
      >
        {this.shouldShow && (
          <div class={styles.container} style="z-index: 2147483647;"
            onClick={(e: Event) => {
              if ((e.target as HTMLElement).classList.contains(styles.card_container)) {
                this.shouldShow = false;
              }
            }}>
            <div class={styles.card_container}>
              <div class={["card", styles.card]}>
                <div class={["card-header d-flex justify-content-between", styles.card_header]}>
                  <h4 class="card-title">{this.$t("general.setting")}</h4>
                  <div class="h-100 d-flex align-items-center">
                    <button class="btn-close" onClick={() => this.shouldShow = false} aria-label="Close"></button>
                  </div>
                </div>
                <div class={["card-body custom-scrollbar", styles.card_body]}>
                  <UsePwa>
                    {({
                      default: (props: DefaultSlotProps) => (
                        <>
                          {props.isAvailable && (
                            <div class="d-flex justify-content-center mb-4 mt-3">
                              {props.installButton()}
                            </div>
                          )}
                        </>
                      )
                    })}
                  </UsePwa>

                  {this.scaleFitures && (
                    <>
                      <h6 class="heading-small">
                        {this.$t("general.scale")} {`(${this.$setting.scale})`}
                      </h6>
                      <Range
                        v-model={this.$setting.scale}
                        min={0.3}
                        max={1}
                        step={0.1}
                        lazyUpdate
                      />
                    </>
                  )}

                  {/* language select */}
                  <h6 class="heading-small">{this.$t("general.language")}</h6>
                  <select class="form-select mb-2"
                    value={this.$setting.locale}
                    onInput={(e: Event) => this.$setting.locale = (e.target as HTMLSelectElement).value as LocaleCode}>
                    {Object.keys(this.$config.LOCALE).map(locale => (
                      <option key={locale} value={locale}>
                        {(this.$config.LOCALE as any)[locale]}
                      </option>
                    ))}
                  </select>

                  <hr />

                  <h6 class="heading-small">{this.$t("general.theme")}</h6>
                  <nav class="nav nav-pills custom-nav-pills mb-2">
                    {this.$config.THEMES.map(theme => (
                      <div key={theme}
                        class={["nav-link", { active: this.$setting.theme == theme }]}
                        onClick={() => this.$setting.theme = theme}>
                        <font-awesome-icon icon={theme == "auto" ? "lightbulb" : (theme == "dark" ? "moon" : "sun")} />
                        <span class="ms-2">{this.$t(`setting.theme.${theme}`)}</span>
                      </div>
                    ))}
                  </nav>
                  {this.$setting.theme == "auto" && (
                    <small class="text-muted">
                      {this.$t("setting.theme.message.auto")}
                    </small>
                  )}
                  <hr />

                  {/* quran-font select */}
                  <h6 class="heading-small">{this.$t("general.quran-font")}</h6>
                  <select class="form-select mb-2"
                    value={this.$setting.fontType}
                    onInput={(e: Event) =>
                      this.$setting.fontType = ((e.target as HTMLSelectElement).value as unknown) as FontType}>
                    {this.$config.FONTS.map(font => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>

                  <div class="d-flex justify-content-between mt-3">
                    <div class="h-100">
                      <h6 class="heading-small mt-2">{this.$t("general.font-size")}</h6>
                    </div>
                    <div class="d-flex">
                      <Button onClick={() => this.$setting.fontSize--} disabled={this.$setting.fontSize <= 1} outline>
                        <font-awesome-icon icon="minus" />
                      </Button>
                      <span class="h6 fw-bold h-100 d-flex align-items-center ms-4 me-4">
                        {this.$setting.fontSize}
                      </span>
                      <Button onClick={() => this.$setting.fontSize++} disabled={this.$setting.fontSize >= 10} outline>
                        <font-awesome-icon icon="plus" />
                      </Button>
                    </div>
                  </div>
                  <div class={["text-end font-arabic-auto fs-arabic-auto mt-3 mb-3", styles.text_bismillah]}>
                    بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                  </div>
                  <h6 class="heading-small">{this.$t("general.word-by-word")}</h6>
                  <div class="row border-bottom mb-2 pb-2">
                    <div class="col-4 d-flex align-items-center">
                      <Checkbox
                        v-model={this.$setting.transliteration}
                        label={this.$t("general.transliteration")}
                      />
                    </div>
                    <div class="col-8 d-flex justify-content-end">
                      <div class="row">
                        <div class="col-6 d-flex align-items-center">
                          <h6 class="pe-3">{this.$t("setting.display")}:</h6>
                        </div>
                        <div class="col-6">
                          <Checkbox
                            label={this.$t("setting.display-inline")}
                            v-model={this.$setting.transliterationDisplay.inline}
                            disabled={!this.$setting.transliteration}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="row mt-2">
                    <div class="col-4 d-flex align-items-center">
                      <Checkbox
                        v-model={this.$setting.translation}
                        label={this.$t("setting.translation")}
                      />
                    </div>
                    <div class="col-8 d-flex justify-content-end">
                      <div class="row">
                        <div class="col-6 d-flex align-items-center">
                          <h6 class="pe-3">{this.$t("setting.display")}:</h6>
                        </div>
                        <div class="col-6">
                          <Checkbox
                            label={this.$t("setting.display-inline")}
                            v-model={this.$setting.translationDisplay.inline}
                            disabled={!this.$setting.translation}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pengaturan Kesalahan (list vertikal dengan checkbox dan input teks untuk label) */}
                  <hr />
                  <h6 class="heading-small">Pengaturan Kesalahan</h6>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.keys(this.errorColors).map(key => (
                      <div key={key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: this.errorColors[key],
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        color: '#000',
                        gap: '8px'
                      }}>
                        <input
                          type="checkbox"
                          class="form-check-input"
                          checked={this.checkedErrors[key]}
                          onInput={(e: Event) =>
                            this.checkedErrors[key] = (e.target as HTMLInputElement).checked
                          }
                        />
                        {this.editingLabel === key ? (
                         <input
                         type="text"
                         data-editing={key}
                         style={{
                           border: 'none',
                           background: 'transparent',
                          
                           width: '100%'
                         }}
                         value={this.customLabels[key]}
                         onInput={(e: Event) => {
                           this.customLabels[key] = (e.target as HTMLInputElement).value;
                         }}
                         onBlur={() => {
                           this.editingLabel = null;
                         }}
                       />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <span style={{ flex: 1 }}>
                              {this.customLabels[key] || key}
                            </span>
                            {/* Icon edit menggunakan SVG baru dan langsung fokus input */}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24px"
                              height="24px"
                              viewBox="0 0 24 24"
                              fill="none"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                this.editingLabel = key;
                                nextTick(() => {
                                  const inputEl = document.querySelector(`input[data-editing="${key}"]`) as HTMLInputElement;
                                  if (inputEl) inputEl.focus();
                                });
                              }}
                            >
                              <path d="M11 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40974 4.40973 4.7157 4.21799 5.09202C4 5.51985 4 6.0799 4 7.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.0799 20 7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V12.5M15.5 5.5L18.3284 8.32843M10.7627 10.2373L17.411 3.58902C18.192 2.80797 19.4584 2.80797 20.2394 3.58902C21.0205 4.37007 21.0205 5.6364 20.2394 6.41745L13.3774 13.2794C12.6158 14.0411 12.235 14.4219 11.8012 14.7247C11.4162 14.9936 11.0009 15.2162 10.564 15.3882C10.0717 15.582 9.54378 15.6885 8.48793 15.9016L8 16L8.04745 15.6678C8.21536 14.4925 8.29932 13.9048 8.49029 13.3561C8.65975 12.8692 8.89125 12.4063 9.17906 11.9786C9.50341 11.4966 9.92319 11.0768 10.7627 10.2373Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <hr />
                  <div class="d-flex justify-content-center mt-4">
                    <Button type="primary" onClick={this.$setting.resetToDefault}>
                      {this.$t("setting.reset-default")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Transition>
    )
  }
});

