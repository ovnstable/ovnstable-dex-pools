import { Entity, Column, UpdateDateColumn, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'skims', name: 'pl_dashboard' })
export class PlDashboard {
  @Column()
  chain: string;

  @Column({ nullable: false })
  dex_name: string;

  @Column({ nullable: false })
  pool_name: string;

  @PrimaryColumn()
  pool_address: string;

  @Column({ nullable: false })
  token_name: string;

  @Column({ nullable: false })
  token_address: string;

  @Column({ nullable: false })
  operation: string;

  @Column({ nullable: false })
  operation_type: string;

  @Column()
  to_address: string;

  @Column()
  bribe_address: string;

  @Column()
  fee_receiver: string;

  @Column({ type: 'integer', default: 0 })
  fee_percent: string;

  @UpdateDateColumn()
  date: Date;
}
