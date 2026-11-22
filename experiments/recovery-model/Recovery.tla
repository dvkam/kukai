------------------------------ MODULE Recovery ------------------------------
EXTENDS Integers
CONSTANTS BaseDelay, DisputeDelay, Horizon
VARIABLES now, disputed, deadline, firstObjection, completedAt, hasFactor
vars == <<now, disputed, deadline, firstObjection, completedAt, hasFactor>>
Absent == -1

Init == /\ now = 0 /\ deadline = BaseDelay /\ disputed = FALSE
        /\ firstObjection = Absent /\ completedAt = Absent
        /\ hasFactor \in BOOLEAN

Tick == /\ completedAt = Absent /\ now < Horizon
        /\ now' = now + 1
        /\ UNCHANGED <<disputed, deadline, firstObjection, completedAt, hasFactor>>

Object == /\ completedAt = Absent
          /\ firstObjection' = IF firstObjection = Absent THEN now ELSE firstObjection
          /\ disputed' = TRUE
          /\ deadline' = IF ~disputed
                         THEN IF now + DisputeDelay > BaseDelay THEN now + DisputeDelay ELSE BaseDelay
                         ELSE deadline
          /\ UNCHANGED <<now, completedAt, hasFactor>>

Complete == /\ completedAt = Absent
            /\ now >= deadline
            /\ (~disputed \/ hasFactor)
            /\ completedAt' = now
            /\ UNCHANGED <<now, disputed, deadline, firstObjection, hasFactor>>

Next == Tick \/ Object \/ Complete \/ (completedAt # Absent /\ UNCHANGED vars)
Spec == Init /\ [][Next]_vars

TypeOK == /\ disputed \in BOOLEAN
          /\ now \in 0..Horizon /\ deadline \in 0..(Horizon + DisputeDelay)
          /\ firstObjection \in Absent..Horizon /\ completedAt \in Absent..Horizon
          /\ hasFactor \in BOOLEAN

REC6BTime == completedAt = Absent \/
             (completedAt >= BaseDelay /\
              (firstObjection = Absent \/ completedAt >= firstObjection + DisputeDelay))
REC6COnce == IF firstObjection = Absent THEN deadline = BaseDelay
             ELSE /\ deadline >= BaseDelay /\ deadline >= firstObjection + DisputeDelay
                  /\ deadline \in {BaseDelay, firstObjection + DisputeDelay}
REC6CFactor == completedAt = Absent \/ firstObjection = Absent \/ hasFactor

\* The replay script asks TLC for witnesses that these two predicates can be false.
NoOrdinaryCompletion == ~(completedAt # Absent /\ firstObjection = Absent /\ ~hasFactor)
NoDisputedCompletion == ~(completedAt # Absent /\ firstObjection # Absent /\ hasFactor)
=============================================================================
