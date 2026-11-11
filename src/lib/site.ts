export const DELIVERY_FEE = 15000;
export const RESERVATION_OPENING_TIME = "07:00";
export const RESERVATION_LAST_SLOT = "21:30";
export const RESERVATION_SLOT_STEP_MINUTES = 30;
export const RESERVATION_MIN_ADVANCE_MINUTES = 60;
export const RESERVATION_MAX_ADVANCE_DAYS = 30;
export const RESERVATION_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function getReservationSlotCapacity(): number {
  const configuredCapacity = Number(process.env.RESERVATION_SLOT_CAPACITY);
  return Number.isSafeInteger(configuredCapacity) && configuredCapacity > 0
    ? configuredCapacity
    : 30;
}

export const SITE_INFO = {
  name: "TRẠM XANH",
  address: "Số 2 Lê Quang Đạo, Từ Liêm, Hà Nội",
  phone: "0366 263 190",
  email: "hello@tramxanh.com",
  openingHours: {
    opensAt: "07:00",
    closesAt: "22:00",
    label: "Hằng ngày, 07:00 – 22:00",
  },
  googleMapsUrl:
    "https://maps.app.goo.gl/AJYy8ttuPxCn9isM9",
  googleMapsEmbedUrl:
    "https://www.google.com/maps?q=123+Nguyen+Hue%2C+Quan+1%2C+Ho+Chi+Minh+City&output=embed",
} as const;
