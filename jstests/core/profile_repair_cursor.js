// Confirms that a repairCursor command and subsequent getMores of its cursor are profiled
// correctly.

(function() {
    "use strict";

    // For getLatestProfilerEntry and getProfilerProtocolStringForCommand
    load("jstests/libs/profiler.js");

    var testDB = db.getSiblingDB("profile_repair_cursor");
    var testColl = testDB.testColl;
    assert.commandWorked(testDB.dropDatabase());

    // Insert some data to scan over.
    assert.writeOK(testColl.insert([{}, {}, {}, {}]));

    testDB.setProfilingLevel(2);

    const repairCursorCmd = {repairCursor: testColl.getName()};
    const profileEntryFilter = {op: "command", command: repairCursorCmd};

    let cmdRes = testDB.runCommand(repairCursorCmd);
    if (cmdRes.code === ErrorCodes.CommandNotSupported) {
        // Some storage engines do not support this command, so we can skip this test.
        return;
    }
    assert.commandWorked(cmdRes);

    assert.eq(testDB.system.profile.find(profileEntryFilter).itcount(),
              1,
              "expected to find profile entry for a repairCursor command");

    const getMoreCollName = cmdRes.cursor.ns.substr(cmdRes.cursor.ns.indexOf(".") + 1);
    cmdRes = assert.commandWorked(
        testDB.runCommand({getMore: cmdRes.cursor.id, collection: getMoreCollName}));

    const getMoreProfileEntry = getLatestProfilerEntry(testDB, {op: "getmore"});
    assert.eq(getMoreProfileEntry.originatingCommand, repairCursorCmd);
})();