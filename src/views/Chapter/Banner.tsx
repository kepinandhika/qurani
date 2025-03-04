import PlayAudioButton from "@/components/AudioPlayer/PlayAudioButton";
import Button from "@/components/Button/Button";
import Card from "@/components/Card/Card";
import Switcher from "@/components/QuranReader/Switcher";
import { ChapterInfo, Chapters } from "@/types";
import { PropType, Transition, defineComponent, ref } from "vue";
import "@/components/Layout/bism.css";


export default defineComponent({
    props: {
        chapter: {
            type: Object as PropType<Chapters>,
            required: true
        },
        chapterInfo: {
            type: Object as PropType<ChapterInfo>,
            required: true
        }
    },
    render() {
        return (
            <>
                <Card class="shadow-md bg-primary bg-gradient text-white position-relative" headerClasses="text-center border-white">
                    {{
                        header: () => (
                            <>
                                <h4>
                                    {this.chapter.name_simple}
                                </h4>
                                <p class="mb-1">
                                    {this.chapter.translated_name.name}
                                </p>
                                <router-link 
                                    to={{ name: "chapter.info", params: { id: this.$route.params.id } }} 
                                    class="position-absolute top-0 end-0 m-4 text-white"
                                >
                                    <font-awesome-icon icon="info-circle" size="2x" />
                                </router-link>
                            </>
                        ),
                        default: () => (
                            <div class="text-center text-capitalize">
                                <p>{this.chapter.revelation_place} - {this.chapter.verses_count} {this.$t("general.ayah")}</p>
                            </div>
                        )
                    }}
                </Card>

                <div class="row d-flex justify-content-between mb-5 mt-5">
                    <div class="col-6 col-md-4">
                        <Switcher />
                    </div>
                    <div class="col-5 col-md-2">
                        <PlayAudioButton audioId={this.chapter.id} />
                    </div>
                </div>

                {this.chapter.bismillah_pre && (
    <div class="container-fluid d-flex justify-content-center mb-5">
        <img class="img-fluid bismillah-img" src="/assets/svg/bismillah.svg" />
    </div>
)}

            </>
        )
    }
})