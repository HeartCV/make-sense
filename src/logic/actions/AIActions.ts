import {DetectedObject} from "@tensorflow-models/coco-ssd";
import {ImageData, LabelName, LabelRect} from "../../store/labels/types";
import {LabelsSelector} from "../../store/selectors/LabelsSelector";
import uuidv1 from 'uuid/v1';
import {store} from "../../index";
import {updateImageDataById} from "../../store/labels/actionCreators";
import {ObjectDetector} from "../../ai/ObjectDetector";
import {ImageRepository} from "../imageRepository/ImageRepository";
import {LabelStatus} from "../../data/enums/LabelStatus";
import {findLast} from "lodash";
import {updateSuggestedLabelList} from "../../store/ai/actionCreators";
import {PopupWindowType} from "../../data/enums/PopupWindowType";
import {updateActivePopupType} from "../../store/general/actionCreators";
import {AISelector} from "../../store/selectors/AISelector";

export class AIActions {
    public static detectRectsForActiveImage(): void {
        const activeImageData: ImageData = LabelsSelector.getActiveImageData();
        AIActions.detectRects(activeImageData.id, ImageRepository.getById(activeImageData.id))
    }

    public static detectRects(imageId: string, image: HTMLImageElement): void {
        if (LabelsSelector.getImageDataById(imageId).isVisitedByObjectDetector)
            return;

        ObjectDetector.predict(image, (predictions: DetectedObject[]) => {
            const suggestedLabelNames = AIActions.extractNewSuggestedLabelNames(LabelsSelector.getLabelNames(), predictions);
            const rejectedLabelNames = AISelector.getRejectedSuggestedLabelList();
            const newlySuggestedNames = AIActions.excludeRejectedLabelNames(suggestedLabelNames, rejectedLabelNames);
            if (newlySuggestedNames.length > 0) {
                store.dispatch(updateSuggestedLabelList(newlySuggestedNames));
                store.dispatch(updateActivePopupType(PopupWindowType.SUGGEST_LABEL_NAMES));
            }
            AIActions.savePredictions(imageId, predictions);
        })
    }

    public static savePredictions(imageId: string, predictions: DetectedObject[]) {
        const imageData: ImageData = LabelsSelector.getImageDataById(imageId);
        const predictedLabels: LabelRect[] = AIActions.mapPredictionsToRectLabels(predictions);
        const nextImageData: ImageData = {
            ...imageData,
            labelRects: imageData.labelRects.concat(predictedLabels),
            isVisitedByObjectDetector: true
        };
        store.dispatch(updateImageDataById(imageData.id, nextImageData));
    }

    private static mapPredictionsToRectLabels(predictions: DetectedObject[]): LabelRect[] {
        return predictions.map((prediction: DetectedObject) => {
            return {
                id: uuidv1(),
                labelIndex: null,
                labelId: null,
                rect: {
                    x: prediction.bbox[0],
                    y: prediction.bbox[1],
                    width: prediction.bbox[2],
                    height: prediction.bbox[3],
                },
                isCreatedByAI: true,
                status: LabelStatus.UNDECIDED
            }
        })
    }

    public static extractNewSuggestedLabelNames(labels: LabelName[], predictions: DetectedObject[]): string[] {
        return predictions.reduce((acc: string[], prediction: DetectedObject) => {
            if (!acc.includes(prediction.class) && !findLast(labels, {name: prediction.class})) {
                acc.push(prediction.class)
            }
            return acc;
        }, [])
    }

    public static excludeRejectedLabelNames(suggestedLabels: string[], rejectedLabels: string[]): string[] {
        return suggestedLabels.reduce((acc: string[], label: string) => {
            if (!rejectedLabels.includes(label)) {
                acc.push(label)
            }
            return acc;
        }, [])
    }
}