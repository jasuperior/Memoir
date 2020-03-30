import { applyPatches, createDraft, finishDraft, enablePatches, Draft, isDraft, immerable, Patch } from "immer";
enablePatches();
// type RepoType<T> = IRepo & Configurable<T>;

export class Repo {
  draft: Draft<any>;
  state: any;
  construct?: Function;
  patches: Patch[] = [];
  inverse: Patch[] = [];
  stash: Patch[] = []; //where undo data is held until cleared
  cursor: number = 0;
  parent?: Repo;
  [key: string]: any;
  [immerable] = true;

  constructor( originalState: any, parent?: Repo ) {
    const self = this;
    this.draft = createDraft(originalState);
    this.state = originalState;
    //@ts-ignore
    this.parent = parent;

    return new Proxy(originalState, {
      get(_, prop) {
        // (typeof prop !== "symbol") && console.log("get:   ", prop );
        let value = self.getProp(self, prop);
        if (typeof value == "function") value = value.bind(self);
        return value;
      },
      set(_, prop, value) {
        self.setProp(self, prop, value);
        return true;
      },
      ownKeys(target) {
        Object.assign(originalState, self.draft);
        return Reflect.ownKeys(self.draft);
      }
    });
  }
  private getProp( self: Repo, prop: any ) {
    return Reflect.get(self, prop) || Reflect.get(self.draft, prop);
  }
  private setProp( self:Repo, prop: any, value: any ) {
    return (Reflect.get(self, prop) && Reflect.set(self, prop, value))|| Reflect.set(self.draft, prop, value);
  }
  commit(ignore?: boolean) {
    let {patches, inverse} = this;
    finishDraft(this.draft, (p, i) => {
      if (!ignore) {
        this.patches = [...patches,...p];
        this.inverse = [...inverse, ...i];
      }
      this.state = applyPatches(this.state, this.patches);
    });
    
    this.draft = createDraft(this.state);
  }
  undo(index: number = 0) {
    this.commit();
    let patches = this.inverse.splice(this.patches.length - index);
    let redo = this.patches.splice(this.patches.length - index);
    this.state = applyPatches(this.state, patches.reverse());
    this.stash = [...this.stash, ...redo];
    this.commit(true);
  }
  redo(index: number = 0) {
    if (!this.stash.length) return;
    this.commit();
    let patches = this.stash.splice(0, index);
    console.log(patches);
    this.draft = applyPatches(this.draft, patches);
    this.commit();
  }
  fork() {
    let fork = new Repo({ ...this.state }, this);
    fork.patches = [...this.patches];
    fork.inverse = [...this.inverse];
    return fork;
  }
  merge( repo: Repo ) {
    repo.draft = applyPatches(repo.draft, this.patches);
    repo.commit();
  }
}

var d = new Repo({});
d.x = 32;
d.y = 32;
d.twenty = 334;
d.commit();

// d.state //?
d.patches //?