import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Exchanger } from '../../../exchanger/models/entities/exchanger.entity';

@Entity('pools')
export class Pool {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Exchanger, (exchanger) => exchanger.pools)
  exchanger: Exchanger;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  address: string;

  @Column({ default: 18, nullable: false })
  decimals: number;

  @Column({ type: 'real' })
  tvl: string;

  @Column({ type: 'real' })
  apr: string;

  @Column({ default: true, nullable: false })
  enable: boolean;

  @UpdateDateColumn()
  updated_at: Date;
}
