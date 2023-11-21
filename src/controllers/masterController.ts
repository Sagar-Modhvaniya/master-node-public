import {
  createdDocumentResponse,
  successResponse,
  recordNotFound,
} from '../helpers/messages';
import defaults from '../helpers/defaults';
import * as masterService from '../services/master';
import {
  bulkUpdate,
  findOneAndUpdateDocument,
  createDocument,
  getDocumentByQuery,
} from '../helpers/dbService';
import mongoose from 'mongoose';
import { VALIDATION } from '../constants/common';


const catchAsync = (fn: any) => {
  return defaults.catchAsync(fn);
};

export const createMaster = catchAsync(async (req: any, res: any) => {
  const {Master, File}  = req?.clientDBConnection ? req?.clientDBConnection.models : mongoose.models
  const data = new Master({
    ...req.body,
  });
  const { parentId, code } = req.body;
  let search: { code: string; parentId?: string } = { code };
  if (parentId) search.parentId = parentId;
  const resp = await getDocumentByQuery(Master, search);
  if (resp) {
    throw new Error(VALIDATION.MASTER_EXISTS);
  }
  if (data.parentId && data.isDefault) {
    await bulkUpdate(
      Master,
      { parentId: data.parentId, isDefault: true },
      { isDefault: false }
    );
  }
  const masterData = await createDocument(Master, data);
  const result = await Master.populate(masterData, [
    { path: 'img', model: File, select: 'uri' },
  ]);
  if (result) {
    let section = result.parentCode ? 'submaster' : 'master';
    res.message = req?.i18n?.t(`${section}.create`);
    return createdDocumentResponse(result, res);
  }
});

export const updateMaster = catchAsync(async (req: any, res: any) => {
  const Master  = req?.clientDBConnection ? req?.clientDBConnection.models.Master : mongoose.models.master
  const id = req.params.id;
  const data = req.body;
  if (data.isDefault) {
    // checking if data contains isDefault, if contains, reset all defaults
    const masterData: any = await getDocumentByQuery(Master, { _id: id });
    if (masterData.parentId) {
      await bulkUpdate(
        Master,
        { parentId: masterData.parentId, isDefault: true },
        { isDefault: false }
      );
    }
  }
  await findOneAndUpdateDocument(
    Master,
    {
      _id: id,
    },
    data,
    { new: true },
    { path: 'img', select: 'uri' }
  );
  const result = await Master.findOne({ _id: id });
  if (result) {
    let section = result.parentCode ? 'submaster' : 'master';
    res.message = req?.i18n?.t(`${section}.update`);
    return successResponse(result, res);
  }
});

export const activateMaster = catchAsync(async (req: any, res: any) => {
  const Master  = req?.clientDBConnection ? req?.clientDBConnection.models.Master : mongoose.models.master
  const id = req.params.id;
  const data = req.body;
  const result: any = await findOneAndUpdateDocument(
    Master,
    {
      _id: id,
    },
    data,
    { new: true },
    { path: 'img', select: 'uri' }
  );
  let section = result.parentCode ? 'submaster' : 'master';
  if (result.isActive) {
    res.message = req?.i18n?.t(`${section}.activate`);
  } else {
    res.message = req?.i18n?.t(`${section}.deactivate`);
  }
  return successResponse(result, res);
});

export const webVisibleMaster = catchAsync(async (req: any, res: any) => {
  const Master  = req?.clientDBConnection ? req?.clientDBConnection.models.Master : mongoose.models.master
  const id = req.params.id;
  const data = req.body;
  const result: any = await findOneAndUpdateDocument(
    Master,
    {
      _id: id,
    },
    data,
    { new: true },
    { path: 'img', select: 'uri' }
  );
  let section = result.parentCode ? 'submaster' : 'master';
  if (result.isWebVisible) {
    res.message = req?.i18n?.t(`${section}.display`);
  } else {
    res.message = req?.i18n?.t(`${section}.notDisplay`);
  }
  return successResponse(result, res);
});

export const defaultMaster = catchAsync(async (req: any, res: any) => {
  const Master  = req?.clientDBConnection ? req?.clientDBConnection.models.Master : mongoose.models.master
  const result: any = await masterService.defaultMaster(
    req.params.id,
    req.body,Master
  );
  let section = result.parentCode ? 'submaster' : 'master';
  if (result.isDefault) {
    res.message = req?.i18n?.t(`${section}.default`);
  } else {
    res.message = req?.i18n?.t(`${section}.notDefault`);
  }
  return successResponse(result, res);
});

export const sequenceMaster = catchAsync(async (req: any, res: any) => {
  const Master  = req?.clientDBConnection ? req?.clientDBConnection.models.Master : mongoose.models.master
  const _result = await masterService.sequenceMaster(req.body.sequences,Master);
  res.message = req?.i18n?.t('submaster.seq');
  return successResponse({}, res);
});

export const deleteMaster = catchAsync(async (req: any, res: any) => {
  const Master  = req?.clientDBConnection ? req?.clientDBConnection.models.Master : mongoose.models.master
  const id = req.body.id;
  let isSubmaster = false;
  const master = await Master.findById(id);
  if (!master) {
    res.message = req?.i18n?.t('master.notFound');
    return recordNotFound(res);
  }
  if (master.parentId) {
    // Deleting record is SubMaster, update submaster records sequence
    isSubmaster = true;
    await Master.updateMany(
      { parentId: master.parentId, seq: { $gt: master.seq } },
      { $inc: { seq: -1 } }
    );
  } else {
    // Deleting record is master, delete it's all submaster records
    await Master.deleteMany({ 
      $or: [
        { parentId: master._id },
        { parentCode: master.code },
      ]
    });
  }
  await master.deleteOne();
  res.message = req?.i18n?.t(`${isSubmaster ? 'submaster' : 'master'}.delete`);
  return successResponse({}, res);
});

export const listMaster = catchAsync(async (req: any, res: any) => {
  const {Master,File}  = req?.clientDBConnection ? req?.clientDBConnection.models : mongoose.models
  let { page, limit, sort, populate } = req.body.options;
  const isCountOnly = req.body.isCountOnly || false;
  const search = req.body.search || '';
  const customQuery = req.body.query || {};
  let sortMaster = sort ? sort : { seq: 1 };
  let customOptions = {
    ...(page && limit
      ? { page, limit, sort: sortMaster }
      : { sort: sortMaster }),
  };
  let all =
    (typeof req.body.all !== 'undefined' && req.body.all === true) || false;
  let isActive =
    typeof req.body.isActive !== 'undefined'
      ? req.body.isActive || false
      : null;
      let languages: undefined | string[];
      if (Array.isArray(defaults.languages) && defaults.languages.length > 0) {
        let providedLanguages = defaults.languages.map((lan) => lan.code);
        if (req.body.language && providedLanguages.includes(req.body.language)) {
          languages = [req.body.language];
        } else languages = providedLanguages;
      } else languages = undefined;
    
  const result = await masterService.listMaster(
    customOptions,
    isCountOnly,
    search,
    customQuery,
    isActive === null ? [true, false] : [isActive],
    populate,
    !all,
    Master,
    File
  );
  let section = customQuery.parentCode ? 'submaster' : 'master';
  if (result) {
    res.message = req?.i18n?.t(`${section}.findAll`);
    return successResponse(result, res);
  }
  res.message = req?.i18n?.t(`${section}.notFound`);
  return recordNotFound(res);
});

export const getLanguages = catchAsync(async (req: any, res: any) => {
  return successResponse(
    Array.isArray(defaults.languages) ? defaults.languages : [],
    res
  );
});
