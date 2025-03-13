import { Chapters, Sort } from "@/types";
import { useChapters } from "@/hooks/chapters";
import { PropType, computed, defineComponent } from "vue";
import collect from "collect.js";
import styles from "../Style.module.scss";
import Icon from "@/components/Icon/Icon";

export default defineComponent({
    props: {
        sort: {
            type: String as PropType<Sort>,
            required: true
        }
    },
    setup(props) {
        const chapters = useChapters();
        const data = computed<Chapters[]>(() => {
            const collection = collect(chapters.data.value)
                .filter(chapter => chapter.id <= 30); // Ambil hanya id sampai 30
            
            return (props.sort == "desc"
                ? collection.sortByDesc("id")
                : collection.sortBy("id")).toArray();
        });
        
        return {
            data,
        }
    },
    render() {
        return (
            <div class="d-flex flex-wrap gap-2">  
                {this.data.map(chapter => (
                    <div
                        key={chapter.id}
                        class={[styles.card_chapter, styles.border_radius_1rem]}
                        style={{ width: "82px",}} 
                        onClick={() => this.$router.push({name: "chapter", params: {id: chapter.id}})}
                    >
                        <div class="d-flex justify-content-between h-100">
                            <div class="d-flex align-items-center">
                                <div class="me-1 position-relative d-flex align-items-center text-center">
                                    <Icon class={styles.svg_icon} name="stars-islamic" width={60} height={60} />
                                    <span class="fw-bold h6 position-absolute text-primary" style="transform: translate(-50%, -50%);left: 50%;top: 50%">
                                        {chapter.id}
                                    </span>
                                </div>
                            </div>
                        </div>  
                    </div>
                ))}
            </div>
        )
    }
});