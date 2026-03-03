const UserModel = require('../../models/UserModel')
const { deleteFile } = require('../../helpers/ossHelper');
const { hashPassword, verifyPassword, isHashedPassword } = require('../../helpers/passwordHelper');

const UserService = {
  login: async ({ username, password }) => {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return [];
    }

    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      return [];
    }

    if (!isHashedPassword(user.password)) {
      user.password = await hashPassword(password);
      await user.save();
    }

    return [user];
  },
  upload: async ({ _id, username, introduction, gender, avatar }) => {
    if (avatar) {
      // 删除旧头像
      const user = await UserModel.findById(_id);
      if (user && user.avatar) {
        await deleteFile(user.avatar);
      }
      return UserModel.updateOne({ _id }, {
        username, introduction, gender, avatar
      })
    } else {
      return UserModel.updateOne({ _id }, {
        username, introduction, gender
      })
    }
  },
  add: async ({ username, introduction, gender, avatar, password, role, state, createTime }) => {
    const hashedPassword = await hashPassword(password);
    return UserModel.create({
      username,
      password: hashedPassword,
      introduction,
      gender,
      avatar,
      role,
      state,
      createTime
    })
  },
  // 修改getlist方法，添加分页
  getlist: async ({ id, page, size }) => {
      if(id) {
          return UserModel.find({ _id: id }, ["username", "introduction", "gender", "role", "password", "state", "createTime"]);
      }
      // 分页查询
      const [data, total] = await Promise.all([
          UserModel.find({}, ["username", "introduction", "gender", "role", "avatar", "state", "createTime"])
              .skip((page - 1) * size)
              .limit(Number(size)),
          UserModel.countDocuments({})
      ]);
      
      return { data, total };
  },
  dellist: async ({ _id }) => {
    return UserModel.deleteOne({ _id })

  },
  putlist: async (body) => {
    return UserModel.updateOne({ _id: body._id }, body)
  },
  delManylist: async (body) => {
    return UserModel.deleteMany({ _id: { $in: body._ids } })
  },
  editUser: async ({
    _id,
    username,
    introduction,
    gender,
    role,
    state,
    avatar
  }) => {
    if (avatar) {
      // 删除旧头像
      const user = await UserModel.findById(_id);
      if (user && user.avatar) {
        await deleteFile(user.avatar);
      }
      return UserModel.updateOne(
        { _id },
        {
          username,
          introduction,
          gender,
          role,
          state,
          avatar
        }
      );
    } else {
      return UserModel.updateOne(
        { _id },
        {
          username,
          introduction,
          gender,
          role,
          state
        }
      );
    }
  }
}

module.exports = UserService
