import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'dict', name: 'velocorequest' })
export class Claim {
  @Column({ nullable: false })
  id: string;

  @PrimaryColumn()
  address: string;

  @PrimaryColumn()
  time: number;
}