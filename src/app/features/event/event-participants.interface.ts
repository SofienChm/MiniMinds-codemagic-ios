export interface EventParticipant {
  id?: number;
  eventId: number;
  childId: number;
  registeredAt?: string;
  registeredBy?: string;
  status?: string;
  notes?: string;
  child?: {
    id: number;
    firstName: string;
    lastName: string;
    parent?: {
      id: number;
      firstName: string;
      lastName: string;
    };
  };
}