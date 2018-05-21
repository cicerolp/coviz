import { Widget } from "./widget";

export interface DensityWidget extends Widget {
    setValues(values: number[]): void;
}
