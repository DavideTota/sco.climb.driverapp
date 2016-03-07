package fbk.climblogger;

import android.app.Activity;
import android.app.Dialog;
import android.app.DialogFragment;
import android.app.TimePickerDialog;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Message;
import android.os.Messenger;
import android.os.RemoteException;
import android.os.SystemClock;
import android.os.Vibrator;
import android.util.Log;
import android.view.View;
import android.view.Menu;
import android.view.MenuItem;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ExpandableListAdapter;
import android.widget.ExpandableListView;
import android.widget.ListView;
import android.widget.Spinner;
import android.widget.TimePicker;
import android.widget.Toast;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;

public class ScanActivity extends Activity {

    private final static String TAG = "ScanActivity_GIOVA";
    private Button mStartButton,mStopButton,mTagButton,mCheckInAllButton,mSendCmdButton, mScheduleWUButton;//,mReleaseCmdButton;
    private CheckBox mBroadcastCheckBox, mSelectAllCheckbox;
    private Spinner mStatesSpinner;
    private Vibrator mVibrator;
    private int index = 0;

    private ArrayAdapter<ListView> adapter;
    private ClimbService mClimbService;
    private Context mContext = null;
    private EditText mConsole = null;
    private CheckBox logCheckBox = null;
    private Handler mHandler = null;
    private long lastBroadcastMessageSentMillis = 0;
    private int wakeUP_year = 0, wakeUP_month = 0, wakeUP_day = 0, wakeUP_hour = 0, wakeUP_minute = 0;
    private ArrayList<ClimbNode> climbNodeList;
    private View monitoredChildNodeView;
    ExpandableListView expandableListView;
    MyExpandableListAdapter expandableListAdapter;
    List<ClimbNode> expandableListTitle;
    HashMap<ClimbNode, List<String>> expandableListDetail;

    // Handles various events fired by the Service.
    // ACTION_GATT_CONNECTED: connected to a GATT server.
    // ACTION_GATT_DISCONNECTED: disconnected from a GATT server.
    // ACTION_GATT_SERVICES_DISCOVERED: discovered GATT services.
    // ACTION_DATA_AVAILABLE: received data from the device.  This can be a result of read
    //                        or notification operations.



    private final BroadcastReceiver mClimbUpdateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            final String action = intent.getAction();

            if (ClimbService.ACTION_DEVICE_ADDED_TO_LIST.equals(action)) {

                if(intent.hasExtra(ClimbService.EXTRA_INT_ARRAY)){
                    updateDetailsExpandableListDetails(intent.getIntArrayExtra(ClimbService.EXTRA_INT_ARRAY));
                }else{
                    updateDetailsExpandableListDetails();
                }

                boolean nodeCheckState[] = expandableListAdapter.getNodeCheckState(0);
                if(nodeCheckState != null) {

                    nodeCheckState[climbNodeList.size()-1] =  mSelectAllCheckbox.isChecked();
                    expandableListAdapter.notifyDataSetChanged();
                }
                expandableListAdapter.notifyDataSetChanged();
                log("ACTION_DEVICE_ADDED_TO_LIST broadcast received");

            } else if (ClimbService.ACTION_DEVICE_REMOVED_FROM_LIST.equals(action)) {

                updateDetailsExpandableListDetails();
                expandableListAdapter.notifyDataSetChanged();
                log("ACTION_DEVICE_REMOVED_FROM_LIST broadcast received");

            }else if (ClimbService.ACTION_METADATA_CHANGED.equals(action)) {

                if(intent.hasExtra(ClimbService.EXTRA_INT_ARRAY)){
                    updateDetailsExpandableListDetails(intent.getIntArrayExtra(ClimbService.EXTRA_INT_ARRAY));
                }else{
                    updateDetailsExpandableListDetails();
                }
                expandableListAdapter.notifyDataSetChanged();
                //log("ACTION_METADATA_CHANGED broadcast received");

            }else if (ClimbService.ACTION_DATALOG_ACTIVE.equals(action)) {

                log("Datalog active on file: "+intent.getStringExtra(ClimbService.EXTRA_STRING));
            }else if (ClimbService.ACTION_DATALOG_INACTIVE.equals(action)) {

                log("Datalog stopped");
            }else if (ClimbService.STATE_CONNECTED_TO_CLIMB_MASTER.equals(action)) {
                Toast.makeText(getApplicationContext(),
                        "Connected with GATT!",
                        Toast.LENGTH_SHORT).show();
                expandableListAdapter.notifyDataSetChanged();
                log("Connected with GATT");
            }else if (ClimbService.STATE_DISCONNECTED_FROM_CLIMB_MASTER.equals(action)) {
                //climbNodeList.clear();

                 Toast.makeText(getApplicationContext(),
                    "DISCONNECTED FROM GATT!",
                    Toast.LENGTH_SHORT).show();
                log("DISCONNECTED FROM GATT!");
                updateDetailsExpandableListDetails();
                expandableListAdapter.notifyDataSetChanged();

            }
            else if (ClimbService.ACTION_NODE_ALERT.equals(action)) {
                if(intent.hasExtra(ClimbService.EXTRA_BYTE_ARRAY)){
                    byte[] nodeID = intent.getByteArrayExtra(ClimbService.EXTRA_BYTE_ARRAY);
                    String alertString = "ALERT ON NODE :" + String.format("%02X", nodeID[0]);
                    Toast.makeText(getApplicationContext(),
                            alertString,
                            Toast.LENGTH_LONG).show();

                    log( alertString );
                }else{

                }


            }
        }
    };

    // Code to manage Service lifecycle.
    private final ServiceConnection mServiceConnection = new ServiceConnection() {

        @Override //Questa � usata per ritornare l'oggetto IBinder (c'� solo nei bound services)
        public void onServiceConnected(ComponentName componentName, IBinder service) {
            //la prossima istruzione ritorna l'oggetto BluetoothLeService
            mClimbService = ((ClimbService.LocalBinder) service).getService();
            mClimbService.setHandler(mHandler);
            mClimbService.setContext(getApplicationContext());
            //IN QUESTO PUNTO RICHIEDI LA LISTA DI DISPOSITIVI INIZIALI PER INSERIRLA NELLA LISTVIEW
            climbNodeList = mClimbService.getNodeList();
            //expandableListTitle = climbNodeList;
            //expandableListDetail = ExpandableListDataPump.getData(); //expandableListDetail conterrà le info aggiuntive
            //expandableListTitle = new ArrayList<String>(expandableListDetail.keySet()); //expandableListTitle dovrà contenere i nomi dei dispositivi direttamente visibili dallo smartphone
            expandableListDetail = new HashMap<ClimbNode, List<String>>(); //expandableListDetail conterrà le info aggiuntive
            expandableListAdapter = new MyExpandableListAdapter(mContext, climbNodeList, expandableListDetail);
            expandableListView.setAdapter(expandableListAdapter); // climbNodeList dovrà contenere i nomi dei dispositivi direttamente visibili dallo smartphone
            expandableListAdapter.notifyDataSetChanged();

            //not working, it should expand the master list if the screen is tilted, for suggestions see http://stackoverflow.com/questions/14879207/expand-group-row-programmatically-in-expandable-list
//            if(!climbNodeList.isEmpty()){
//                ClimbNode node = climbNodeList.get(0);
//                if(node.isMasterNode() && node.getConnectionState()){
//                    //expandableListView.expandGroup(0);
//                }
//            }

            Log.i(TAG, "Service connected!");
        }

        @Override
        public void onServiceDisconnected(ComponentName componentName) {
            mClimbService = null;
            Log.i(TAG,"Service disconnected!");
        }
    };

    View.OnClickListener startButtonHandler = new View.OnClickListener(){
        public void onClick(View v) {

            if(mClimbService != null){
                if(logCheckBox != null && logCheckBox.isChecked()) {
                    //TODO: start logging
                    mClimbService.StartMonitoring(true);
                    mVibrator.vibrate(ConfigVals.vibrationTimeout);
                    Log.i(TAG, "Start scan with data logging!");
                    log("Start scan with data logging command sent!");
                }else{
                    mClimbService.StartMonitoring(false);
                    mVibrator.vibrate(ConfigVals.vibrationTimeout);
                    Log.i(TAG, "Start scan without data logging!");
                    log("Start scan without data logging command sent!");
                }

            }else{
                Log.i(TAG, "Start scan not sent!");
                log("Start scan not sent!");
            }

        }
    };

    View.OnClickListener stopButtonHandler = new View.OnClickListener(){
        public void onClick(View v) {

            if(mClimbService != null){
                mVibrator.vibrate(ConfigVals.vibrationTimeout);
                mClimbService.StopMonitoring();
                Log.i(TAG, "Stop scan!");
                log("Stop scan command sent!");
            }else{
                Log.i(TAG, "Stop scan not sent!");
                log("Stop scan not sent!");
            }

        }
    };

    View.OnClickListener tagButtonHandler = new View.OnClickListener(){
        public void onClick(View v) {

            if(mClimbService != null){
                if(mClimbService.insertTag("Manually_inserted_tag")){
                    mVibrator.vibrate(ConfigVals.vibrationTimeout);
                    log("Tag Inserted!");
                }else{
                    log("Tag not inserted! Something went wrong in ClimbService!");
                }

            }else{
                Log.i(TAG, "Tag not inserted! mClimbService == null");
                log("Tag not inserted! mClimbService == null");
            }

        }
    };

//    View.OnClickListener ckInAllButtonHandler = new View.OnClickListener(){
//        public void onClick(View v) {
//
//            if (mBroadcastCheckBox.isChecked()) {
//                if ((SystemClock.uptimeMillis() - lastBroadcastMessageSentMillis) > ConfigVals.consecutiveBroadcastMessageTimeout_ms) {
//                    if (mClimbService != null) {
//                        if (mClimbService.SendCheckInAllCmd()) {
//                            mVibrator.vibrate(ConfigVals.vibrationTimeout);
//                            lastBroadcastMessageSentMillis = SystemClock.uptimeMillis();
//                        } else {
//                            Log.w(TAG, "Check in all not sent!");
//                            log("Check in all not sent!");
//                        }
//                    } else {
//                        Log.w(TAG, "Check in all not sent!");
//                        log("Check in all not sent!");
//                    }
//                } else {
//                    String alertString = "Wait a little";
//                    Toast.makeText(getApplicationContext(),
//                            alertString,
//                            Toast.LENGTH_LONG).show();
//                }
//            }else{ //not broadcast a message
//                if(expandableListAdapter != null) {
//                    boolean[] childCheckStates = expandableListAdapter.getNodeCheckState(0);
//                    if(mClimbService.setNewStateToCheckedNodes(0x02,childCheckStates,0)){
//                        mVibrator.vibrate(ConfigVals.vibrationTimeout);
//                    }else {
//                        Log.w(TAG, "Check in not sent!");
//                    }
//                }else {
//                    Log.w(TAG, "expandableListAdapter == null!!");
//                }
//            }
//        }
//    };
    View.OnClickListener sendCmdButtonHandler = new View.OnClickListener(){
        public void onClick(View v) {

            if (climbNodeList != null && !climbNodeList.isEmpty()){
                if (mBroadcastCheckBox.isChecked()) {
                    if ((SystemClock.uptimeMillis() - lastBroadcastMessageSentMillis) > ConfigVals.consecutiveBroadcastMessageTimeout_ms) {
                        if (mClimbService != null) {
                            String selectedState_S = mStatesSpinner.getSelectedItem().toString();
                            int selectedState_i = stateString2int(selectedState_S);
                            if (selectedState_i < 5) { //allow only transitions to valid states
                                if (mClimbService.SendBroadcastStateChange(selectedState_i)) {
                                    mVibrator.vibrate(ConfigVals.vibrationTimeout);
                                    lastBroadcastMessageSentMillis = SystemClock.uptimeMillis();
                                } else {
                                    Log.w(TAG, "Cmd not sent!");
                                    log("Cmd not sent!");
                                }
                            } else {
                                Log.w(TAG, "Wrong state selected: " + selectedState_i);
                            }
                        } else {
                            Log.w(TAG, "Cmd not sent!");
                            log("Cmd not sent!");
                        }

                    } else {
                        String alertString = "Wait a little";
                        Toast.makeText(getApplicationContext(),
                                alertString,
                                Toast.LENGTH_LONG).show();
                    }
                } else { //not broadcast a messages
                    if (expandableListAdapter != null) {
                        boolean[] childCheckStates = expandableListAdapter.getNodeCheckState(0);
                        if (childCheckStates != null) {

                            String selectedState_S = mStatesSpinner.getSelectedItem().toString();
                            int selectedState_i = stateString2int(selectedState_S);
                            if (selectedState_i < 5) { //allow only transitions to valid states
                                if (mClimbService.setNewStateToCheckedNodes(selectedState_i, childCheckStates, 0)) {
                                    mVibrator.vibrate(ConfigVals.vibrationTimeout);
                                } else {
                                    Log.i(TAG, "Cmd not sent!");
                                }
                            } else {
                                Log.w(TAG, "Wrong state selected: " + selectedState_i);
                            }
                        }
                    } else {
                        Log.w(TAG, "expandableListAdapter == null!!");
                    }
                }
            }else{
                Toast.makeText(mContext,
                        "Master NOT CONNECTED!",
                        Toast.LENGTH_SHORT).show();
            }
        }
};
    View.OnClickListener scheduleWUButtonHandler = new View.OnClickListener(){
        public void onClick(View v) {

            mVibrator.vibrate(ConfigVals.vibrationTimeout);

            DialogFragment newFragment = new DatePickerFragment();
            newFragment.show(getFragmentManager(), "datePicker");

        }
    };
    public void setWakeUpDate(int year, int month, int day){
        wakeUP_year = year;
        wakeUP_month = month;
        wakeUP_day = day;
    }

    public void setWakeUpHour(int hour, int minute){
        wakeUP_hour = hour;
        wakeUP_minute = minute;
    }

    public void sendWakeUpCMD(){

        if( (SystemClock.uptimeMillis() - lastBroadcastMessageSentMillis) > ConfigVals.consecutiveBroadcastMessageTimeout_ms) {
            if (mClimbService != null) {

                GregorianCalendar wakeUpDate = new GregorianCalendar(wakeUP_year,wakeUP_month,wakeUP_day,wakeUP_hour,wakeUP_minute);
                GregorianCalendar nowDate = new GregorianCalendar(Locale.ITALY);

                long wakeUpDate_millis = wakeUpDate.getTimeInMillis();
                long nowDate_millis = nowDate.getTimeInMillis();

                if( wakeUpDate_millis > nowDate_millis ) {
                    long diff_Sec = (wakeUpDate_millis-nowDate_millis)/1000;
                    if(diff_Sec < ConfigVals.MAX_WAKE_UP_DELAY_SEC && diff_Sec == (int)diff_Sec){

                        if (mClimbService.ScheduleWakeUpCmd((int) diff_Sec)) {
                            mVibrator.vibrate(ConfigVals.vibrationTimeout);
                            lastBroadcastMessageSentMillis = SystemClock.uptimeMillis();
                            Log.i(TAG, "schedule wake up sent!");
                            return;
                        } else {
                            Log.i(TAG, "schedule wake up not sent!");
                            log("schedule wake up not sent!");
                        }
                        return;

                    }
                }

                Toast.makeText(getApplicationContext(),
                        "Date not accepted...",
                        Toast.LENGTH_SHORT).show();
                mVibrator.vibrate(ConfigVals.vibrationTimeout*2);

            } else {
                Log.i(TAG, "schedule wake up not sent!");
                log("schedule wake up not sent!");
            }
        }else{
            String alertString = "Wait a little";
            Toast.makeText(getApplicationContext(),
                    alertString,
                    Toast.LENGTH_LONG).show();
        }

    }

    View.OnClickListener selectAllCheckboxHandler = new View.OnClickListener(){
        public void onClick(View v) {

            mVibrator.vibrate(ConfigVals.vibrationTimeout);

            if(expandableListAdapter != null) {
                boolean nodeCheckState[] = expandableListAdapter.getNodeCheckState(0);
                if(nodeCheckState != null) {
                    boolean checked = mSelectAllCheckbox.isChecked();
                    for (int i = 0; i < nodeCheckState.length; i++) {
                        nodeCheckState[i] = checked;
                    }
                    expandableListAdapter.notifyDataSetChanged();
                }
            }
        }
    };



/*    View.OnClickListener releaseCmdButtonHandler = new View.OnClickListener(){
        public void onClick(View v) {

            DialogFragment newFragment = new DatePickerFragment();
            newFragment.show(getFragmentManager(), "datePicker");
        }

    };*/

    ExpandableListView.OnGroupExpandListener mOnGroupExpandListener = new ExpandableListView.OnGroupExpandListener() {

        @Override
        public void onGroupExpand(int groupPosition) {
            Log.i(TAG, "Group expanded, position: " + groupPosition);
            //ClimbNode clickedNode = climbNodeList.get(groupPosition);

            mClimbService.onNodeClick(groupPosition, -1);
            mVibrator.vibrate(ConfigVals.vibrationTimeout);


        }
    };

    ExpandableListView.OnGroupCollapseListener mOnGroupCollapseListener = new ExpandableListView.OnGroupCollapseListener() {

        @Override
        public void onGroupCollapse(int groupPosition) {

            mClimbService.onNodeClick(groupPosition, -2);
            mVibrator.vibrate(ConfigVals.vibrationTimeout);
        }
    };

    ExpandableListView.OnChildClickListener mOnChildClickListener = new ExpandableListView.OnChildClickListener() {
        @Override
        public boolean onChildClick(ExpandableListView parent, View v,
                                    int groupPosition, int childPosition, long id) {

            mClimbService.onNodeClick(groupPosition,childPosition);
            mVibrator.vibrate(ConfigVals.vibrationTimeout);

            return false;
        }
    };


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scan);
        mHandler = new Handler();

        mContext = this.getApplicationContext();

        //mConsole = (EditText) findViewById(R.id.console_item);

        //listView = (ListView) findViewById(R.id.list);

        mStartButton = (Button) findViewById(R.id.buttonStart);
        mStartButton.setOnClickListener(startButtonHandler);


        mStopButton = (Button) findViewById(R.id.buttonStop);
        mStopButton.setOnClickListener(stopButtonHandler);

        logCheckBox = (CheckBox) findViewById(R.id.logCheckBox);

        mTagButton = (Button) findViewById(R.id.buttonTag);
        mTagButton.setOnClickListener(tagButtonHandler);

        //mCheckInAllButton = (Button) findViewById(R.id.buttonCheckInAll);
        //mCheckInAllButton.setOnClickListener(ckInAllButtonHandler);

        mSendCmdButton = (Button) findViewById(R.id.sendCmd);
        mSendCmdButton.setOnClickListener(sendCmdButtonHandler);

        mScheduleWUButton = (Button) findViewById(R.id.scheduleWakeUpAll);
        mScheduleWUButton.setOnClickListener(scheduleWUButtonHandler);

        mSelectAllCheckbox = (CheckBox) findViewById(R.id.selectAllCheckbox);
        mSelectAllCheckbox.setOnClickListener(selectAllCheckboxHandler);

        mBroadcastCheckBox = (CheckBox) findViewById(R.id.broadcastCheckBox);

        mStatesSpinner = (Spinner) findViewById(R.id.statesSpinner);
        // Create an ArrayAdapter using the string array and a default spinner layout
        ArrayAdapter<CharSequence> adapter = ArrayAdapter.createFromResource(this, R.array.Node_states, R.layout.spinner_item);
        // Specify the layout to use when the list of choices appears
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        // Apply the adapter to the spinner
        mStatesSpinner.setAdapter(adapter);

       // mReleaseCmdButton = (Button) findViewById(R.id.test);
        //mReleaseCmdButton.setOnClickListener(releaseCmdButtonHandler);

        mVibrator = (Vibrator) this.getSystemService(VIBRATOR_SERVICE);

        expandableListView = (ExpandableListView) findViewById(R.id.list);

        Intent climbServiceIntent = new Intent(ScanActivity.this, ClimbService.class); //capire come si comporta nel caso in qui il servizio sia ancora in esecuzione in background
        startService(climbServiceIntent);


        expandableListView.setOnGroupExpandListener( mOnGroupExpandListener );

        expandableListView.setOnGroupCollapseListener( mOnGroupCollapseListener );

        expandableListView.setOnChildClickListener( mOnChildClickListener );
    }


    @Override
    protected void onStart() {
        super.onStart();


    }
    @Override
    protected void onResume() {
        super.onResume();
        Log.i(TAG, "ScanActivity.onResume() called.");
        log("ScanActivity.onResume() called.");

        //AVVIA IL SERVIZIO E INIZIALIZZA IL BIND
        Intent climbServiceIntent = new Intent(ScanActivity.this, ClimbService.class); //capire come si comporta nel caso in qui il servizio sia ancora in esecuzione in background
        bindService(climbServiceIntent, mServiceConnection, BIND_AUTO_CREATE);

        registerReceiver(mClimbUpdateReceiver, makeClimbServiceIntentFilter());

    }

    @Override
    protected void onPause() {
        Log.i(TAG, "ScanActivity.onPause() called.");
        log("ScanActivity.onPause() called.");
        super.onPause();
        unregisterReceiver(mClimbUpdateReceiver);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        Log.i(TAG, "ScanActivity.onDestroy() called.");
        log("ScanActivity.onDestroy() called.");

        //stopService(new Intent(ScanActivity.this, ClimbService.class));
        //climbNodeList = null;
        unbindService(mServiceConnection);
        //mClimbService = null;
        //expandableListDetail = null;
        //expandableListAdapter = null;
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.menu_scan, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_settings) {
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    private void updateDetailsExpandableListDetails(final int[] changedClimbNodeIndex){
        if(climbNodeList != null) {
            for (int i = 0; i < changedClimbNodeIndex.length; i++) {
                ClimbNode actualNode = climbNodeList.get(changedClimbNodeIndex[i]);
                if (actualNode != null) {
                    List<String> actualNodeDetailsList = actualNode.getClimbNeighbourList();
                    expandableListDetail.put(actualNode, actualNodeDetailsList); //il metodo put sostituisce il vecchio valore, quindi nella hashmap non si creano doppioni
                }
            }
        }

    }

    private void updateDetailsExpandableListDetails(){
        if(climbNodeList != null) {
            for (int i = 0; i < climbNodeList.size(); i++) {
                ClimbNode actualNode = climbNodeList.get(i);
                if (actualNode != null) {
                    List<String> actualNodeDetailsList = actualNode.getClimbNeighbourList();
                    expandableListDetail.put(actualNode, actualNodeDetailsList); //il metodo put sostituisce il vecchio valore, quindi nella hashmap non si creano doppioni
                }
            }
        }

    }

    private int stateString2int(String stateString){
        if(stateString.equals("BY_MYSELF")){
            return 0;
        }else if(stateString.equals("CHECKING")){
            return 1;
        }else if(stateString.equals("ON_BOARD")){
            return 2;
        }else if(stateString.equals("GOING_TO_SLEEP")){
            return 4;
        }else{
            return 6;
        }
    }

    private void log(final String txt) {
        if(mConsole == null) return;

        final String timestamp = new SimpleDateFormat("HH:mm:ss.SSS").format(new Date());
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                mConsole.setText(timestamp + " : " + txt + "\n" + mConsole.getText());
            }
        });
    }

    private static IntentFilter makeClimbServiceIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(ClimbService.ACTION_DATALOG_ACTIVE);
        intentFilter.addAction(ClimbService.ACTION_DATALOG_INACTIVE);
        intentFilter.addAction(ClimbService.ACTION_METADATA_CHANGED);
        intentFilter.addAction(ClimbService.ACTION_DEVICE_ADDED_TO_LIST);
        intentFilter.addAction(ClimbService.STATE_CONNECTED_TO_CLIMB_MASTER);
        intentFilter.addAction(ClimbService.STATE_DISCONNECTED_FROM_CLIMB_MASTER);
        intentFilter.addAction(ClimbService.ACTION_DEVICE_REMOVED_FROM_LIST);
        intentFilter.addAction(ClimbService.ACTION_NODE_ALERT);
        return intentFilter;
    }



}
