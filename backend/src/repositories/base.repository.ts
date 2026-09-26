import { Model, Document } from "mongoose";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: any;
  populate?: any[];
}

export interface PaginatedResult<T = any> {
  docs: T[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

// Base Repository providing standardized database access patterns.
export class BaseRepository<T extends Document = any> {
  model: Model<any>;

  constructor(model: Model<any>) {
    this.model = model;
  }

  async findById(id: any, { populate = [], select = "", lean = true }: any = {}) {
    let query: any = this.model.findById(id);
    if (select) query = query.select(select);
    for (const pop of populate) query = query.populate(pop);
    if (lean) query = query.lean();
    return query;
  }

  async findOne(filter: any = {}, { populate = [], select = "", lean = true }: any = {}) {
    let query: any = this.model.findOne(filter);
    if (select) query = query.select(select);
    for (const pop of populate) query = query.populate(pop);
    if (lean) query = query.lean();
    return query;
  }

  async find(filter: any = {}, { populate = [], select = "", sort = { createdAt: -1 }, limit, skip, lean = true }: any = {}) {
    let query: any = this.model.find(filter);
    if (select) query = query.select(select);
    for (const pop of populate) query = query.populate(pop);
    if (sort) query = query.sort(sort);
    if (typeof skip === "number") query = query.skip(skip);
    if (typeof limit === "number") query = query.limit(limit);
    if (lean) query = query.lean();
    return query;
  }

  async count(filter: any = {}): Promise<number> {
    return this.model.countDocuments(filter);
  }

  async create(data: any): Promise<any> {
    return this.model.create(data);
  }

  async insertMany(docs: any[], options: any = {}): Promise<any> {
    return this.model.insertMany(docs, options);
  }

  async updateById(id: any, updates: any, options: any = { new: true }): Promise<any> {
    return this.model.findByIdAndUpdate(id, updates, options);
  }

  async updateOne(filter: any, updates: any, options: any = { new: true }): Promise<any> {
    return this.model.findOneAndUpdate(filter, updates, options);
  }

  async deleteById(id: any): Promise<any> {
    return this.model.findByIdAndDelete(id);
  }

  async deleteOne(filter: any): Promise<any> {
    return this.model.findOneAndDelete(filter);
  }

  async deleteMany(filter: any): Promise<any> {
    return this.model.deleteMany(filter);
  }

  async paginate(
    filter: any = {},
    { page = 0, limit = 20, sort = { createdAt: -1 }, populate = [] }: PaginationOptions = {}
  ): Promise<PaginatedResult<any>> {
    const skip = page * limit;
    const [docs, total] = await Promise.all([
      this.find(filter, { skip, limit, sort, populate, lean: true }),
      this.count(filter)
    ]);

    return {
      docs,
      total,
      hasMore: skip + docs.length < total,
      page,
      limit
    };
  }
}
