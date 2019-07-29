import {IRect} from "../../interfaces/IRect";

export abstract class BaseRenderEngine {
    abstract mouseDownHandler(event: MouseEvent): void;
    abstract mouseMoveHandler(event: MouseEvent): void;
    abstract mouseUpHandler(event: MouseEvent): void;
    abstract updateImageRect(imageRect: IRect): void;
    abstract render(): void;
}