define((require, exports, module) => {
  const storeManager = require('State')
  const Kinematic = require('Kinematic')

  localState = {
    jointOutOfBound: [false, false, false, false, false, false],
  }
  const maxAngleVelocity = 90.0 / (180.0 * Math.PI) / 1000.0
  const geo = [
    [1.5, 0, 5.25],
    [0, 0, 7.7],
    [1, 0, 1.5],
    [7.05, 0, 0],
    [1.1, 0, 0],
    [0, 0, 0],
  ]
  const defaultRobotState = {
    robotJoint: 5,
    target: {
      position: {
        x: 10,
        y: 10,
        z: 10,
      },
      rotation: {
        x: Math.PI,
        y: 0,
        z: 0,
      },
    },
    angles: {
      A1: 0,
      A2: 0,
      A3: 0,
      A4: 0,
      A5: -90 / 180 * Math.PI,
      A6: 0,
    },
    jointOutOfBound: [false, false, false, false, false, false],
    maxAngleVelocities: {
      J0: maxAngleVelocity,
      J1: maxAngleVelocity,
      J2: maxAngleVelocity,
      J3: maxAngleVelocity,
      J4: maxAngleVelocity,
      J5: maxAngleVelocity,
    },
    jointLimits: {
      J0: [-180 / 180 * Math.PI, 180 / 180 * Math.PI],
      J1: [-135 / 180 * Math.PI, 100 / 180 * Math.PI],
      J2: [-80  / 180 * Math.PI, 190 / 180 * Math.PI],
      J3: [-200 / 180 * Math.PI, 200 / 180 * Math.PI],
      J4: [-130 / 180 * Math.PI, 130 / 180 * Math.PI],
      J5: [-360 / 180 * Math.PI, 360 / 180 * Math.PI],
    },
    configuration: [false, false, false],
    geometry: {
      V0: {
        x: geo[0][0],
        y: geo[0][1],
        z: geo[0][2],
      },
      V1: {
        x: geo[1][0],
        y: geo[1][1],
        z: geo[1][2],
      },
      V2: {
        x: geo[2][0],
        y: geo[2][1],
        z: geo[2][2],
      },
      V3: {
        x: geo[3][0],
        y: geo[3][1],
        z: geo[3][2],
      },
      V4: {
        x: geo[4][0],
        y: geo[4][1],
        z: geo[4][2],
      },
    },
  }
  const robotStore = storeManager.createStore('Robot', defaultRobotState)

  let IK

  function updateIK(geometry) {
    const geo = Object.values(geometry).map((val, i, array) => [val.x, val.y, val.z])
    // todo not optimal, since IK is a sideeffect
    IK = new Kinematic(geo)
  }

  robotStore.listen([state => state.geometry], (geometry) => {
    updateIK(geometry)
  })

  const calculateAngles = (jointLimits, position, rotation, configuration) => {
    const angles = []
    IK.calculateAngles(
      position.x,
      position.y,
      position.z,
      rotation.x,
      rotation.y,
      rotation.z,
      angles,
      configuration
    )

    outOfBounds = [false, false, false, false, false, false]
    let i = 0
    for (const index in jointLimits) {
      if (angles[i] < jointLimits[index][0] || angles[i] > jointLimits[index][1]) {
        outOfBounds[i] = true
      }
      i++
    }

    return {
      angles,
      outOfBounds,
    }
  }

  /* --- Reducer --- */
  robotStore.action('ROBOT_CHANGE_TARGET', (state, data) => {
    const {
      angles,
      outOfBounds,
    } = calculateAngles(state.jointLimits, data.position, data.rotation, state.configuration)
    return Object.assign({}, state, {
      target: {
        position: Object.assign({}, data.position),
        rotation: Object.assign({}, data.rotation),
      },
    }, {
      angles: {
        A1: angles[0],
        A2: angles[1],
        A3: angles[2],
        A4: angles[3],
        A5: angles[4],
        A6: angles[5],
      },
    }, {
      jointOutOfBound: [...outOfBounds],
    },{robotJoint:2})
  })

  robotStore.action('ROBOT_CHANGE_ANGLES', (state, angles) => {
    const TCPpose = []
    IK.calculateTCP(
       angles.A1,
      -angles.A2,
      -angles.A3,
       angles.A4,
      -angles.A5,
      -angles.A6,
      TCPpose,
    )
    // IK.calculateAngles(TCPpose[0], TCPpose[1], TCPpose[2], TCPpose[3], TCPpose[4], TCPpose[5], angles)

    return Object.assign({}, state,
    { robotJoint :3
    }, {
      target: {
        position: {
          x: TCPpose[0],
          y: TCPpose[1],
          z: TCPpose[2],
        },
        rotation: {
          x: TCPpose[3],
          y: TCPpose[4],
          z: TCPpose[5],
        },
      },
    }, {
      angles: {
        A1: angles.A1,
        A2: angles.A2,
        A3: angles.A3,
        A4: angles.A4,
        A5: angles.A5,
        A6: angles.A6,
      },
    })
    // return Object.assign({}, state, {
    //   target: {
    //     position: {
    //       x: TCPpose[0],
    //       y: TCPpose[1],
    //       z: TCPpose[2],
    //     },
    //     rotation: {
    //       x: TCPpose[3],
    //       y: TCPpose[4],
    //       z: TCPpose[5],
    //     },
    //   },
    // }, {
    //   angles: {
    //     A1: angles[0],
    //     A2: angles[1],
    //     A3: angles[2],
    //     A4: angles[3],
    //     A5: angles[4],
    //     A6: angles[5],
    //   },
    // })
    // { todo
    //   jointOutOfBound: [...result],
    // }
  })

  robotStore.action('ROBOT_CHANGE_GEOMETRY', (state, data) => {
    const geo = Object.assign({}, state.geometry, data)
    updateIK(geo)
    const {
      angles,
      outOfBounds,
    } = calculateAngles(state.jointLimits, state.target.position, state.target.rotation, state.configuration)
    return Object.assign({}, state, {
      angles: {
        A1: angles[0],
        A2: angles[1],
        A3: angles[2],
        A4: angles[3],
        A5: angles[4],
        A6: angles[5],
      },
    }, {
      jointOutOfBound: [...outOfBounds],
    }, {
      geometry: {
        V0: {
          x: geo.V0.x,
          y: geo.V0.y,
          z: geo.V0.z,
        },
        V1: {
          x: geo.V1.x,
          y: geo.V1.y,
          z: geo.V1.z,
        },
        V2: {
          x: geo.V2.x,
          y: geo.V2.y,
          z: geo.V2.z,
        },
        V3: {
          x: geo.V3.x,
          y: geo.V3.y,
          z: geo.V3.z,
        },
        V4: {
          x: geo.V4.x,
          y: geo.V4.y,
          z: geo.V4.z,
        },
      },
    })
  })

  robotStore.action('ROBOT_CHANGE_JOINT_LIMITS', (state, data) => {
    const {
      outOfBounds,
    } = calculateAngles(state.jointLimits, state.target.position, state.target.rotation, state.configuration)
    return { ...state,
      jointOutOfBound: [...outOfBounds],
      jointLimits: { ...state.jointLimits,
        ...data,
      },
    }
  })

  robotStore.action('ROBOT_CHANGE_CONFIGURATION', (state, data) => {
    const {
      angles,
      outOfBounds,
    } = calculateAngles(state.jointLimits, state.target.position, state.target.rotation, data)
    return Object.assign({}, state, {
      angles: {
        A1: angles[0],
        A2: angles[1],
        A3: angles[2],
        A4: angles[3],
        A5: angles[4],
        A6: angles[5],
      },
      configuration: [...data],
      jointOutOfBound: [...outOfBounds],
    })
  })

  module.exports = robotStore
})
// todo -> get rid of scene injection using require scene -> threerobot handles 3d view
