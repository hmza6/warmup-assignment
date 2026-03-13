const fs = require("fs");
 
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    function toSeconds(time) {
        let parts = time.trim().split(/[: ]/);
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);
        let period = parts[3];
 
        if (h === 12) h = (period === "am") ? 0 : 12;
        else if (period === "pm") h += 12;
 
        return h * 3600 + m * 60 + s;
    }
 
    let diff = toSeconds(endTime) - toSeconds(startTime);
 
    let h  = Math.floor(diff / 3600);
    let m  = Math.floor((diff % 3600) / 60);
    let s  = diff % 60;
    let mm = m < 10 ? "0" + m : "" + m;
    let ss = s < 10 ? "0" + s : "" + s;
 
    return h + ":" + mm + ":" + ss;
}
 
// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    function toSeconds(time) {
        let parts = time.trim().split(/[: ]/);
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);
        let period = parts[3];
 
        if (h === 12) h = (period === "am") ? 0 : 12;
        else if (period === "pm") h += 12;
 
        return h * 3600 + m * 60 + s;
    }
 
    const DELIVERY_START = 8  * 3600;  // 8:00 AM
    const DELIVERY_END   = 22 * 3600;  // 10:00 PM
 
    let start = toSeconds(startTime);
    let end   = toSeconds(endTime);
 
    let idle = 0;
 
    // Idle before 8 AM
    if (start < DELIVERY_START)
        idle += Math.min(end, DELIVERY_START) - start;
 
    // Idle after 10 PM
    if (end > DELIVERY_END)
        idle += end - Math.max(start, DELIVERY_END);
 
    let h  = Math.floor(idle / 3600);
    let m  = Math.floor((idle % 3600) / 60);
    let s  = idle % 60;
    let mm = m < 10 ? "0" + m : "" + m;
    let ss = s < 10 ? "0" + s : "" + s;
 
    return h + ":" + mm + ":" + ss;
}
 
// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function toSeconds(time) {
        let parts = time.trim().split(":");
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);
        return h * 3600 + m * 60 + s;
    }
 
    let diff = toSeconds(shiftDuration) - toSeconds(idleTime);
 
    let h  = Math.floor(diff / 3600);
    let m  = Math.floor((diff % 3600) / 60);
    let s  = diff % 60;
    let mm = m < 10 ? "0" + m : "" + m;
    let ss = s < 10 ? "0" + s : "" + s;
 
    return h + ":" + mm + ":" + ss;
}
 
// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    function toSeconds(time) {
        let parts = time.trim().split(":");
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);
        return h * 3600 + m * 60 + s;
    }
 
    // Check if date falls within Eid al-Fitr (April 10–30, 2025)
    let d = new Date(date);
    let year  = d.getFullYear();
    let month = d.getMonth() + 1; // 0-indexed
    let day   = d.getDate();
 
    let isEid = (year === 2025 && month === 4 && day >= 10 && day <= 30);
 
    let quota = isEid ? 6 * 3600 : 8 * 3600 + 24 * 60; // 6:00:00 or 8:24:00
 
    return toSeconds(activeTime) >= quota;
}
 
// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let { driverID, driverName, date, startTime, endTime } = shiftObj;
 
    let content = fs.readFileSync(textFile, "utf8");
    let lines = content.split("\n").filter(line => line.trim() !== "");
 
    // Check for duplicate (same driverID + date)
    for (let line of lines) {
        let cols = line.split(",");
        if (cols[0].trim() === driverID.trim() && cols[2].trim() === date.trim())
            return {};
    }
 
    // Calculate the fields
    let shiftDuration = getShiftDuration(startTime, endTime);
    let idleTime      = getIdleTime(startTime, endTime);
    let activeTime    = getActiveTime(shiftDuration, idleTime);
    let quota         = metQuota(date, activeTime);
 
    let newRecord = {
        driverID,
        driverName,
        date,
        startTime,
        endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: quota,
        hasBonus: false
    };
 
    let newLine = `${driverID},${driverName},${date},${startTime},${endTime},${shiftDuration},${idleTime},${activeTime},${quota},false`;
 
    // Find the last line of this driverID, insert after it
    // If driverID not found, append at end
    let lastIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].split(",")[0].trim() === driverID.trim())
            lastIndex = i;
    }
 
    if (lastIndex === -1) {
        lines.push(newLine);
    } else {
        lines.splice(lastIndex + 1, 0, newLine);
    }
 
    fs.writeFileSync(textFile, lines.join("\n") + "\n", "utf8");
 
    return newRecord;
}
 
// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
