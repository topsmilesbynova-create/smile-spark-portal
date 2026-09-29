import type {
  AdminNotification,
  AvailabilitySettings,
  Booking,
  CancelBookingRequest,
  CreateBookingRequest,
  FormDraft,
  FormField,
  PaymentMethod,
  PublicBookingStatus,
  PublishedForm,
  RejectPaymentRequest,
  RescheduleBookingRequest,
  ReservedReference,
  Service,
  SubmitPaymentProofRequest,
  TimeSlot,
  UploadKind,
  UploadRef,
  VerifyPaymentRequest,
  VisitorEvent,
  VisitorSession,
} from "./contracts";

/** Patient-facing operations. No authentication. */
export interface PublicApi {
  listServices(): Promise<Service[]>;
  listPaymentMethods(): Promise<PaymentMethod[]>;
  getPublishedForm(): Promise<PublishedForm>;
  getAvailability(): Promise<AvailabilitySettings>;
  /** date: "YYYY-MM-DD" in the clinic time zone. */
  getSlots(date: string): Promise<TimeSlot[]>;
  reserveBookingReference(): Promise<ReservedReference>;
  uploadFile(file: File, kind: UploadKind): Promise<UploadRef>;
  createBooking(request: CreateBookingRequest): Promise<PublicBookingStatus>;
  getBookingStatus(reference: string): Promise<PublicBookingStatus | null>;
  resubmitPaymentProof(request: SubmitPaymentProofRequest): Promise<PublicBookingStatus>;
}

/** Staff operations. The backend must enforce authentication on every one of these. */
export interface AdminApi {
  listBookings(): Promise<Booking[]>;
  confirmBooking(id: string): Promise<Booking>;
  rescheduleBooking(id: string, request: RescheduleBookingRequest): Promise<Booking>;
  cancelBooking(id: string, request: CancelBookingRequest): Promise<Booking>;
  verifyPayment(id: string, request: VerifyPaymentRequest): Promise<Booking>;
  rejectPayment(id: string, request: RejectPaymentRequest): Promise<Booking>;

  listServices(): Promise<Service[]>;
  saveServices(services: Service[]): Promise<Service[]>;
  getAvailability(): Promise<AvailabilitySettings>;
  saveAvailability(settings: AvailabilitySettings): Promise<AvailabilitySettings>;

  listPaymentMethods(): Promise<PaymentMethod[]>;
  savePaymentMethods(methods: PaymentMethod[]): Promise<PaymentMethod[]>;

  getPublishedForm(): Promise<PublishedForm>;
  /** The exact form a booking was submitted against. */
  getFormVersion(version: number): Promise<PublishedForm | null>;
  getFormDraft(): Promise<FormDraft | null>;
  saveFormDraft(fields: FormField[]): Promise<FormDraft>;
  publishForm(fields: FormField[]): Promise<PublishedForm>;

  listNotifications(): Promise<AdminNotification[]>;
  markNotificationsRead(): Promise<void>;

  listVisitors(): Promise<VisitorSession[]>;
  /** Streams presence changes. Returns an unsubscribe function. */
  subscribeVisitors(onEvent: (event: VisitorEvent) => void): () => void;
}

export interface TopSmilesApi {
  public: PublicApi;
  admin: AdminApi;
}
