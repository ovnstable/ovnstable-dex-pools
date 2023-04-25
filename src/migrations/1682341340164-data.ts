import {MigrationInterface, QueryRunner} from "typeorm";

export class data1682341340164 implements MigrationInterface {
    name = 'data1682341340164'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "pools" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "address" character varying NOT NULL, "decimals" integer NOT NULL DEFAULT '18', "tvl" real NOT NULL, "apr" real NOT NULL, "enable" boolean NOT NULL DEFAULT true, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "exchangerId" integer, CONSTRAINT "PK_6708c86fc389259de3ee43230ee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."exchangers_exchanger_type_enum" AS ENUM('VELODROME', 'THENA', 'BEETHOVEN', 'WOMBAT', 'RAMSES', 'VELOCORE')`);
        await queryRunner.query(`CREATE TABLE "exchangers" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "apiUrl" character varying NOT NULL, "enable" boolean NOT NULL DEFAULT true, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "exchanger_type" "public"."exchangers_exchanger_type_enum" NOT NULL, CONSTRAINT "UQ_ad2cd16b02f97c43281e92c90a6" UNIQUE ("exchanger_type"), CONSTRAINT "PK_1dfa656891d6b707c12034b4a76" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "pools" ADD CONSTRAINT "FK_1a840aec55a22f46453e4d371e8" FOREIGN KEY ("exchangerId") REFERENCES "exchangers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pools" DROP CONSTRAINT "FK_1a840aec55a22f46453e4d371e8"`);
        await queryRunner.query(`DROP TABLE "exchangers"`);
        await queryRunner.query(`DROP TYPE "public"."exchangers_exchanger_type_enum"`);
        await queryRunner.query(`DROP TABLE "pools"`);
    }

}
