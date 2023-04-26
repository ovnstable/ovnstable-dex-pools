import { Entity, Column, UpdateDateColumn, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'anal', name: 'pools' })
export class Pool {
  @Column({ nullable: false })
  platform: string;

  @Column({ nullable: false })
  name: string;

  @PrimaryColumn()
  address: string;

  @Column({ type: 'real' })
  tvl: string;

  @Column()
  chain: string;

  @Column({ type: 'real' })
  apr: string;

  @Column({ default: true, nullable: false })
  add_to_sync: boolean;

  @UpdateDateColumn()
  update_date: Date;
}
