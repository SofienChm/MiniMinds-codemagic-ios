export interface EventModel {
  id?: number;
  name: string;
  type: string;
  description: string;
  price: number;
  ageFrom: number;
  ageTo: number;
  capacity: number;
  time: string;
  place?: string;
  image?: string;
  createdAt?: string;
  participants?: {
    id: number;
    childId: number;
    registeredAt: string;
    status: string;
    child: {
      id: number;
      firstName: string;
      lastName: string;
      profilePicture?: string;
      parent?: {
        id: number;
        firstName: string;
        lastName: string;
      };
    };
  }[];
}