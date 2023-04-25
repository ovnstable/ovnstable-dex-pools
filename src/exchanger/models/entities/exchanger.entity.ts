import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Pool } from '../../../pool/models/entities/pool.entity';
import { ExchangerType } from '../inner/exchanger.type';

@Entity('exchangers')
export class Exchanger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  apiUrl: string;

  @Column({ default: true, nullable: false })
  enable: boolean;

  @UpdateDateColumn()
  updated_at: Date;

  @Column('enum', { enum: ExchangerType, nullable: false, unique: true })
  exchanger_type: ExchangerType;

  @OneToMany(() => Pool, (pool) => pool.exchanger)
  pools: Pool[];
}
