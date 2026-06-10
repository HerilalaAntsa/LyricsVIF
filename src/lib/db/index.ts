import Dexie from "dexie";
import type { Table } from "dexie";
import type {
  Background,
  BibleVersion,
  Church,
  Service,
  ServiceItem,
  Song,
  User,
  Verse,
} from "./schema";

export class FihiranaDB extends Dexie {
  churches!: Table<Church, string>;
  users!: Table<User, string>;
  songs!: Table<Song, string>;
  bible_versions!: Table<BibleVersion, string>;
  verses!: Table<Verse, string>;
  services!: Table<Service, string>;
  service_items!: Table<ServiceItem, string>;
  backgrounds!: Table<Background, string>;

  constructor() {
    super("fihirana");

    this.version(1).stores({
      churches: "&id, &slug",
      users: "&id, church_id, email",
      songs: "&id, church_id, [church_id+visibility], [church_id+language], title, sequence",
      bible_versions: "&id, language",
      verses: "&id, version_id, [version_id+book+chapter+verse]",
      services: "&id, church_id, date, [church_id+date]",
      service_items: "&id, service_id, [service_id+order]",
      backgrounds: "&id, church_id",
    });
  }
}

export const db = new FihiranaDB();
