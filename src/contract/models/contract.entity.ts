import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'dict', name: 'contracts' })
export class Contract {
  @Column({ nullable: false })
  chain: string;

  @Column({ nullable: false })
  id: string;

  @PrimaryColumn()
  address: string;

}
