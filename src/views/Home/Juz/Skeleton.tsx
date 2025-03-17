import { defineComponent } from "vue";
import Skeleton from "@/components/Skeleton/Skeleton";
import styles from "../Style.module.scss";

export default defineComponent({
    setup() {
        return () => (
            <div 
                class={styles.juz_container} 
                style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "8px"
                }}
            >
                {Array(2).fill(0).map((_, rowIndex) => (
                    <div 
                        key={rowIndex}
                        style={{ 
                            display: "flex", 
                            gap: "8px", 
                            flexWrap: "nowrap", 
                            overflowX: "auto" 
                        }}
                    >
                        {Array(4).fill(0).map((_, colIndex) => (
                            <Skeleton
                                key={colIndex}
                                class={[styles.card_chapter, styles.border_radius_1rem]}
                                width="82px"
                                height="82px"
                                style={{ minWidth: "82px", minHeight: "82px" }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        );
    }
});
