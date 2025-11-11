// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title VoteRegistry - minimal registry for anonymized vote commitments and tallies
/// @notice Stores vote commitments (VotePub) and tally commitments (TallyPub) per round identifier (rid)
contract VoteRegistry {
    struct VotePub {
        bytes32 rid;        // round identifier
        bytes32 nullifier;  // prevents double-voting
        bytes   com;        // commitment (compressed curve point)
    }

    struct TallyPub {
        bytes32 rid;
        bytes   comSum;     // aggregated commitment
        bytes32 listHash;   // binds to the commitment list
        uint256 tau;        // threshold value agreed off-chain
    }

    event VoteSubmitted(bytes32 indexed rid, bytes32 indexed nullifier, bytes com);
    event TallyAccepted(bytes32 indexed rid, bytes comSum, bytes32 listHash, bool decision);
    event ParamsUpdated(uint256 sMax, uint256 tau);
    event RoundOpened(bytes32 indexed rid);
    event LeafRegistered(bytes32 indexed rid, address indexed src, bytes encLeaf);
    event SourceUpdated(address indexed src, bool allowed);

    address public owner;
    bytes32 public currentRid;
    uint256 public sMax;
    uint256 public tauParam;

    mapping(bytes32 => VotePub[]) private votesByRound;
    mapping(bytes32 => TallyPub) public tallyByRound;
    mapping(bytes32 => bool) private seenNullifiers;
    mapping(bytes32 => bytes[]) private registries;
    mapping(address => bool) public sources;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function setOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
    }

    function submitVote(bytes32 rid, bytes32 nullifier, bytes calldata com) external {
        bytes32 key = keccak256(abi.encodePacked(rid, nullifier));
        require(!seenNullifiers[key], "nullifier used");
        seenNullifiers[key] = true;

        votesByRound[rid].push(VotePub({rid: rid, nullifier: nullifier, com: com}));
        emit VoteSubmitted(rid, nullifier, com);
    }

    function acceptTally(bytes32 rid, bytes calldata comSum, bytes32 listHash, uint256 tau, bool decision) external onlyOwner {
        require(tau > 0, "tau=0");
        TallyPub memory tally = TallyPub({rid: rid, comSum: comSum, listHash: listHash, tau: tau});
        tallyByRound[rid] = tally;

        emit TallyAccepted(rid, comSum, listHash, decision);
    }

    function setParams(uint256 _sMax, uint256 _tau) external onlyOwner {
        require(_sMax > 0, "sMax=0");
        require(_tau > 0, "tau=0");
        sMax = _sMax;
        tauParam = _tau;
        emit ParamsUpdated(_sMax, _tau);
    }

    function setRound(bytes32 rid) external onlyOwner {
        require(rid != bytes32(0), "rid=0");
        currentRid = rid;
        emit RoundOpened(rid);
    }

    function setSource(address src, bool on) external onlyOwner {
        require(src != address(0), "zero src");
        sources[src] = on;
        emit SourceUpdated(src, on);
    }

    function register(bytes calldata encLeaf) external {
        require(currentRid != bytes32(0), "round not set");
        require(sources[msg.sender], "unauthorized src");
        registries[currentRid].push(encLeaf);
        emit LeafRegistered(currentRid, msg.sender, encLeaf);
    }

    function getVotes(bytes32 rid) external view returns (VotePub[] memory) {
        return votesByRound[rid];
    }

    function hasNullifier(bytes32 rid, bytes32 nullifier) external view returns (bool) {
        return seenNullifiers[keccak256(abi.encodePacked(rid, nullifier))];
    }

    function getRegistrations(bytes32 rid) external view returns (bytes[] memory) {
        return registries[rid];
    }
}
