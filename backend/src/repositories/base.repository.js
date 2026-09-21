// Base Repository providing standardized database access patterns.
export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id, { populate = [], select = "", lean = true } = {}) {
    let query = this.model.findById(id);
    if (select) query = query.select(select);
    for (const pop of populate) query = query.populate(pop);
    if (lean) query = query.lean();
    return query;
  }

  async findOne(filter = {}, { populate = [], select = "", lean = true } = {}) {
    let query = this.model.findOne(filter);
    if (select) query = query.select(select);
    for (const pop of populate) query = query.populate(pop);
    if (lean) query = query.lean();
    return query;
  }

  async find(filter = {}, { populate = [], select = "", sort = { createdAt: -1 }, limit, skip, lean = true } = {}) {
    let query = this.model.find(filter);
    if (select) query = query.select(select);
    for (const pop of populate) query = query.populate(pop);
    if (sort) query = query.sort(sort);
    if (typeof skip === "number") query = query.skip(skip);
    if (typeof limit === "number") query = query.limit(limit);
    if (lean) query = query.lean();
    return query;
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async create(data) {
    return this.model.create(data);
  }

  async insertMany(docs, options = {}) {
    return this.model.insertMany(docs, options);
  }

  async updateById(id, updates, options = { new: true }) {
    return this.model.findByIdAndUpdate(id, updates, options);
  }

  async updateOne(filter, updates, options = { new: true }) {
    return this.model.findOneAndUpdate(filter, updates, options);
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id);
  }

  async deleteOne(filter) {
    return this.model.findOneAndDelete(filter);
  }

  async deleteMany(filter) {
    return this.model.deleteMany(filter);
  }

  async paginate(filter = {}, { page = 0, limit = 20, sort = { createdAt: -1 }, populate = [] } = {}) {
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
