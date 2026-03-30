// backend/utils/cancellationCodes.js
import { ORDER_STATUS_CODES } from "./orderStatus.js";

export const CANCELLED_CODES = [
    ORDER_STATUS_CODES.CANCELLED_BY_SELLER,
    ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING,
    ORDER_STATUS_CODES.CANCELLED_BY_ADMIN,
    "CANCELLED", // Legacy support
    "ملغى"       // Legacy support
];
