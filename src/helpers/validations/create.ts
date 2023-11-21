import joi from "joi";


export default joi
  .object({
    name: joi.string().optional(),
    code: joi
      .string()
      .uppercase()
      .replace(/\s+/g, '_')
      // .external(method)
      .required(),
    names: joi.object().optional(),
    extra: joi.string().optional(),
    desc: joi.string().allow('').optional(),
    parentId: joi.string().optional(),
    parentCode: joi.string().optional(),
    img: joi.string().optional(),
    seq: joi.number().optional(),
    isDefault: joi.boolean().optional(),
    webDsply: joi.string().allow('').optional(),
    isWebVisible: joi.boolean().optional(),
    canDel: joi.boolean().default(true),
    createdBy: joi.object().optional(),
    updatedBy: joi.object().optional(),
    deletedBy: joi.object().optional(),
    deletedAt: joi.date().optional(),
    isActive: joi.boolean().default(true),
  })
  .unknown(false);
