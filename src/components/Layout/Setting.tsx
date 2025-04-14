import { computed, defineComponent, Transition, watch, ref, onMounted } from "vue";
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

        const checkedErrors = ref<Record<string, boolean>>({});

onMounted(() => {
    Object.keys(errorColors).forEach(label => {
        checkedErrors.value[label] = true; // default-nya semua dicentang
    });
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

        // Pengaturan Kesalahan: daftar kesalahan beserta warnanya secara statis
        const errorColors = {
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

        return {
            shouldShow,
            scaleFitures,
            errorColors,
            checkedErrors
        }
    },
    render() {
        return (
            <Transition
                enterActiveClass={styles.animate_in}
                leaveActiveClass={styles.animate_out}
                onBeforeLeave={(el) => {
                    el.classList.remove(styles.blur)
                }}
                onAfterEnter={(el) => {
                    el.classList.add(styles.blur)
                }}
            >
                {this.shouldShow && (
                    <div 
                        class={styles.container} 
                        style="z-index: 2147483647;"  
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
                                        <button class="btn-close" onClick={() => this.shouldShow = false}></button>
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
                                    <select 
                                        class="form-select mb-2"
                                        value={this.$setting.locale}
                                        onInput={(e: Event) => this.$setting.locale = (e.target as HTMLSelectElement).value as LocaleCode}
                                    >
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
                                            <div
                                                key={theme}
                                                class={["nav-link", {active: this.$setting.theme == theme}]}
                                                onClick={() => this.$setting.theme = theme}
                                            >
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
                                    <select 
                                        class="form-select mb-2"
                                        value={this.$setting.fontType}
                                        onInput={(e: Event) =>
                                            this.$setting.fontType = ((e.target as HTMLSelectElement).value as unknown) as FontType
                                        }
                                    >
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

                                    {/* Pengaturan Kesalahan (statik) dalam bentuk list vertikal dengan checkbox */}
<hr />
<h6 class="heading-small">Pengaturan Kesalahan</h6>
<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {Object.keys(this.errorColors).map(label => (
        <div key={label} style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: this.errorColors[label as keyof typeof this.errorColors],
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            color: '#000'
        }}>
            <input 
                type="checkbox"
                class="form-check-input me-2"
                checked={this.checkedErrors[label]}
                onInput={(e: Event) => this.checkedErrors[label] = (e.target as HTMLInputElement).checked}
            />
            <label>{label}</label>
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
