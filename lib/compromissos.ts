export type ParticipantStatus = 'pendente' | 'confirmado' | 'recusado';

export interface Participant {
  userId: string;
  name: string | null;
  email: string | null;
  status: ParticipantStatus;
}
export interface Appointment {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  city: string | null;
  isGroup: boolean;
  ownerId: string;
  ownerName: string | null;
  role: 'dono' | 'convidado';
  myStatus: ParticipantStatus | null;
  participants: Participant[];
}
