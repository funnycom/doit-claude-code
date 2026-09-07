CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(500) NOT NULL,
	"original_title" varchar(500),
	"original_summary" text,
	"translated_title" varchar(500),
	"translated_summary" text,
	"source_url" varchar(1000),
	"source_name" varchar(100),
	"image_url" varchar(1000),
	"category_id" integer,
	"published_at" timestamp,
	"fetched_at" timestamp DEFAULT now(),
	"notion_page_id" varchar(200),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "articles_guid_unique" UNIQUE("guid")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6B7280' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;