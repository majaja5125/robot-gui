define((require, exports, module) => {
  const gui = require('UiDat')
  const storeManager = require('State')
  const robotStore = require('Robot')

  const geometry = storeManager.getStore('Robot').getState().geometry
  const jointLimits = storeManager.getStore('Robot').getState().jointLimits

  const robotGuiStore = storeManager.createStore('RobotGui', {})


  const DEG_TO_RAD = Math.PI / 180
  const RAD_TO_DEG = 180 / Math.PI
  /* DAT GUI */

  const geometryGui = gui.addFolder('robot geometry')
  for (const link in geometry) {
    if (link) {
      const linkFolder = geometryGui.addFolder(`link ${link}`)
      for (const axis in geometry[link]) {
        if (axis) {
          gui.remember(geometry[link])
          linkFolder.add(geometry[link], axis).min(-10).max(10).step(0.01).onChange(() => {
            robotStore.dispatch('ROBOT_CHANGE_GEOMETRY', geometry)
          })
        }
      }
    }
  }

  const anglesDeg = {
    A1: 0,
    A2: 0,
    A3: 0,
    A4: 0,
    A5: 0,
    A6: 0,
  }

  const configuration = {
    1: false,
    2: false,
    3: false,
  }

  const jointLimitsDeg = {
    J0: [-180, 180],
    J1: [-135, 100],
    J2: [-80, 190],
    J3: [-200, 200],
    J4: [-130, 130],
    J5: [-360, 360],
  }

  const r = { robotJoint:"" }
  gui.add(r, "robotJoint").listen().onChange(() => {
    // console.log("RRRRRRRRRRRRRRRRRRRRRRRRRRRR")
    // robotStore.dispatch('ROBOT_CHANGE_ANGLES', r)
  })

  robotStore.listen([state => state.angles], (angles) => {
    Object.keys(anglesDeg).forEach((k) => {
      anglesDeg[k] = angles[k] / Math.PI * 180
    })
    r.robotJoint = "Joint(" +  
    Math.round(anglesDeg.A1 * 100) / 100 + "," +
    Math.round(anglesDeg.A2 * 100) / 100 + "," +
    Math.round(anglesDeg.A3 * 100) / 100 + "," +
    Math.round(anglesDeg.A4 * 100) / 100 + "," +
    Math.round(anglesDeg.A5 * 100) / 100 + "," +
    Math.round(anglesDeg.A6 * 100) / 100 + ")"
    var joints = document.getElementById("clipboard")
    joints.value = r.robotJoint;
  })

  const anglesGui = gui.addFolder('angles')
  let i = 0
  for (const key in anglesDeg) {
    anglesGui.add(anglesDeg, key).min(jointLimits[`J${i}`][0] * RAD_TO_DEG).max(jointLimits[`J${i++}`][1] * RAD_TO_DEG).step(1).listen().onChange(() => {
      const anglesRad = {robotJoint:123}
      for (const key in anglesDeg) {
        if (anglesDeg.hasOwnProperty(key)) {
          anglesRad[key] = anglesDeg[key] * DEG_TO_RAD
        }
      }
      robotStore.dispatch('ROBOT_CHANGE_ANGLES', anglesRad)
    })
  }

  const configurationGui = gui.addFolder('configuration')
  for (const key in configuration) {
    configurationGui.add(configuration, key).listen().onChange(() => {
      robotStore.dispatch('ROBOT_CHANGE_CONFIGURATION', Object.values(configuration))
    })
  }

  const angleLimitGui = anglesGui.addFolder('angle limits')
  for (const joint in jointLimitsDeg) {
    if (joint) {
      const jointFolder = angleLimitGui.addFolder(`joint ${joint}`)
      for (const limit in jointLimitsDeg[joint]) {
        if (limit) {
          // gui.remember(jointLimitsDeg[joint])

          (j => jointFolder.add(jointLimitsDeg[j], limit).name((limit == 0) ? 'min' : 'max').min(-360).max(360).step(1).onChange(() => {
            limts_rad = {}
            limts_rad[j] = [
              jointLimitsDeg[j][0] * DEG_TO_RAD,
              jointLimitsDeg[j][1] * DEG_TO_RAD,
            ]
            robotStore.dispatch('ROBOT_CHANGE_JOINT_LIMITS', limts_rad)
          }))(joint)
        }
      }
    }
  }

  /* END DAT GUI */

  module.exports = robotStore
})
